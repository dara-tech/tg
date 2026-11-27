import type { AIState, AIPersona, TranscriptEntry } from './types';
import { AI_PERSONAS, DEFAULT_AI_PERSONA, getPersonaConfig } from './personas';
import { downsampleBuffer, floatTo16BitPCM, arrayBufferToBase64, base64ToFloat32Array } from './audioUtils';
import { getSharedAudioContext } from './sharedAudio';

export class AICallService extends EventTarget {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private mixerNode: GainNode | null = null;
  private outputCompressor: DynamicsCompressorNode | null = null;
  private outputGain: GainNode | null = null;

  // Audio queue and jitter buffering
  private nextPlayTime: number = 0;
  private readonly JITTER_BUFFER_SEC = 0.08;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPlayingAudio: boolean = false;
  private speechEndTimer: ReturnType<typeof setTimeout> | null = null;
  private lastInterruptTime: number = 0;
  private lastSpeechStartTime: number = 0;

  // VAD (Voice Activity Detection)
  private readonly NORMAL_VAD_THRESHOLD = 0.003;
  private readonly INTERRUPT_VAD_THRESHOLD = 0.085;
  private readonly SILENCE_CHUNKS_BEFORE_PAUSE = 20;
  private silenceCount = 0;
  private isSendingAudio = false;
  private interruptStreak = 0;

  // Transcripts
  private currentAiTurnText = '';
  private transcriptTimer: ReturnType<typeof setTimeout> | null = null;

  // Status & Persona
  private currentState: AIState = 'disconnected';
  private personaId: AIPersona = DEFAULT_AI_PERSONA;
  private customApiKey: string = '';
  private isMuted: boolean = false;
  private isIntentionalDisconnect: boolean = false;
  private sessionHandle: string | null = null;

  // Volume measurement
  private userVolumeLevel = 0;
  private aiVolumeLevel = 0;

  constructor(persona: AIPersona = DEFAULT_AI_PERSONA, customApiKey: string = '') {
    super();
    this.personaId = persona;
    this.customApiKey = customApiKey;
  }

  public getState(): AIState {
    return this.currentState;
  }

  public getPersona(): AIPersona {
    return this.personaId;
  }

  public setPersona(persona: AIPersona) {
    if (this.personaId === persona) return;
    this.personaId = persona;
    if (this.currentState === 'connected' || this.currentState === 'listening' || this.currentState === 'speaking') {
      this.reconnect();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (muted) {
      this.isSendingAudio = false;
      this.dispatchEvent(new CustomEvent('userSpeaking', { detail: false }));
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private setState(state: AIState) {
    if (this.currentState !== state) {
      this.currentState = state;
      this.dispatchEvent(new CustomEvent('statechange', { detail: state }));
    }
  }

  public async start(apiKey?: string): Promise<void> {
    if (apiKey) this.customApiKey = apiKey;
    this.isIntentionalDisconnect = false;

    // 1. Initialize Web Audio API with shared context
    try {
      this.audioContext = getSharedAudioContext();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }
    } catch {
      this.dispatchEvent(
        new CustomEvent('error', { detail: { message: 'Could not initialize audio device.' } })
      );
      this.setState('error');
      return;
    }

    // Direct output gain connected straight to speakers
    this.outputGain = this.audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    this.outputGain.connect(this.audioContext.destination);

    // 2. Request microphone stream (guard against missing mediaDevices on non-HTTPS / restricted WebViews)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { message: 'Microphone unavailable (requires localhost/HTTPS & mic permission).' },
        })
      );
      this.setState('error');
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      if (this.isIntentionalDisconnect || !this.audioContext || this.audioContext.state === 'closed') {
        this.mediaStream.getTracks().forEach((t) => t.stop());
        this.mediaStream = null;
        return;
      }
      if (this.isMuted) {
        this.mediaStream.getAudioTracks().forEach((t) => (t.enabled = false));
      }
    } catch (err: any) {
      console.error('[AICallService] Mic access error:', err);
      this.dispatchEvent(
        new CustomEvent('error', { detail: { message: 'Microphone permission denied or unavailable' } })
      );
      this.setState('error');
      return;
    }

    // 3. Connect mic to ScriptProcessor for downsampling to 16kHz PCM
    this.mixerNode = this.audioContext.createGain();
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.sourceNode.connect(this.mixerNode);

    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.mixerNode.connect(this.processorNode);

    const silentGain = this.audioContext.createGain();
    silentGain.gain.value = 0;
    this.processorNode.connect(silentGain);
    silentGain.connect(this.audioContext.destination);

    this.setupAudioProcessing();

    // 4. Connect WebSocket
    this.connectWebSocket();
  }

  private setupAudioProcessing() {
    if (!this.processorNode) return;

    this.processorNode.onaudioprocess = (e) => {
      if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const inputData = e.inputBuffer.getChannelData(0);

      let sumSquares = 0;
      for (let i = 0; i < inputData.length; i++) {
        sumSquares += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sumSquares / inputData.length);
      this.userVolumeLevel = Math.min(100, Math.round(rms * 400));
      this.dispatchEvent(
        new CustomEvent('volume', {
          detail: { user: this.userVolumeLevel, ai: this.aiVolumeLevel },
        })
      );

      if (this.isPlayingAudio) {
        // Protect first 1.8s of speech from echo feedback
        const speechDuration = Date.now() - this.lastSpeechStartTime;
        if (speechDuration > 1800 && rms > 0.16) {
          this.interruptStreak++;
          if (this.interruptStreak >= 6) {
            this.silenceCount = 0;
            this.isSendingAudio = true;
            this.interrupt(false);
            this.dispatchEvent(new CustomEvent('userSpeaking', { detail: true }));
          }
        } else {
          this.interruptStreak = 0;
          this.silenceCount++;
          if (this.silenceCount > this.SILENCE_CHUNKS_BEFORE_PAUSE) {
            this.isSendingAudio = false;
            this.dispatchEvent(new CustomEvent('userSpeaking', { detail: false }));
          }
        }
      } else {
        this.interruptStreak = 0;
        if (rms > this.NORMAL_VAD_THRESHOLD) {
          this.silenceCount = 0;
          this.isSendingAudio = true;
          this.dispatchEvent(new CustomEvent('userSpeaking', { detail: true }));
        } else {
          this.silenceCount++;
          if (this.silenceCount > this.SILENCE_CHUNKS_BEFORE_PAUSE) {
            this.isSendingAudio = false;
            this.dispatchEvent(new CustomEvent('userSpeaking', { detail: false }));
          }
        }
      }

      if (!this.isSendingAudio) return;

      const sampleRate = this.audioContext?.sampleRate || 24000;
      const downsampled = downsampleBuffer(inputData, sampleRate, 16000);
      const pcm16 = floatTo16BitPCM(downsampled);
      const base64Data = arrayBufferToBase64(pcm16);

      try {
        this.ws.send(
          JSON.stringify({
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64Data,
                },
              ],
            },
          })
        );
      } catch (err) {
        console.error('[AICallService] Send audio error:', err);
      }
    };
  }

  private connectWebSocket() {
    const key =
      this.customApiKey ||
      (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GEMINI_API_KEY : '') ||
      '';

    if (!key) {
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { message: 'Gemini API Key missing. Please configure key in profile settings.' },
        })
      );
      this.setState('disconnected');
      return;
    }

    this.setState('connecting');
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${key}`;

    try {
      this.ws = new WebSocket(url);
    } catch (e: any) {
      console.error('[AICallService] WebSocket init error:', e);
      this.setState('disconnected');
      return;
    }

    this.ws.onopen = () => {
      console.log('[AICallService] Connected to Gemini Live');
      this.setState('connected');
      this.nextPlayTime = this.audioContext?.currentTime || 0;

      const personaConfig = getPersonaConfig(this.personaId);

      const setupPayload: any = {
        model: 'models/gemini-3.8-live',
        generationConfig: {
          responseModalities: ['AUDIO'],
          temperature: 0.75,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: personaConfig.voice,
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: personaConfig.prompt }],
        },
      };

      if (this.sessionHandle) {
        setupPayload.sessionResumption = { handle: this.sessionHandle };
      }

      this.ws?.send(JSON.stringify({ setup: setupPayload }));

      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.OPEN && !this.sessionHandle) {
          this.ws.send(
            JSON.stringify({
              realtimeInput: {
                text: personaConfig.greeting,
              },
            })
          );
        }
      }, 500);
    };

    this.ws.onmessage = async (event) => {
      try {
        let textData = event.data;
        if (textData instanceof Blob) {
          textData = await textData.text();
        }
        const msg = JSON.parse(textData);

        if (msg.error) {
          console.error('[AICallService] Gemini error response:', msg.error);
          this.dispatchEvent(new CustomEvent('error', { detail: { message: msg.error.message || 'Gemini Error' } }));
        }

        if (msg.sessionResumptionUpdate?.newHandle) {
          this.sessionHandle = msg.sessionResumptionUpdate.newHandle;
        }

        if (msg.serverContent?.modelTurn) {
          const parts = msg.serverContent.modelTurn.parts || [];
          for (const part of parts) {
            if (part.text) {
              this.currentAiTurnText += part.text;
              this.emitTranscript(false);
            }
            if (part.inlineData?.data) {
              this.playAudioChunk(part.inlineData.data);
            }
          }
        } else if (msg.serverContent?.outputTranscription?.text) {
          this.currentAiTurnText += msg.serverContent.outputTranscription.text;
          this.emitTranscript(false);
        }

        if (msg.serverContent?.turnComplete) {
          this.scheduleTranscriptEmit(600);
        }
      } catch (err) {
        console.error('[AICallService] Message parsing error:', err);
      }
    };

    this.ws.onclose = (e) => {
      console.log('[AICallService] WebSocket closed:', e.code, e.reason);
      if (this.isIntentionalDisconnect) {
        this.setState('disconnected');
        return;
      }
      this.setState('reconnecting');
      setTimeout(() => {
        if (!this.isIntentionalDisconnect) {
          this.connectWebSocket();
        }
      }, 2000);
    };

    this.ws.onerror = (err) => {
      console.error('[AICallService] WebSocket error:', err);
    };
  }

  private playAudioChunk(base64Data: string) {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    const float32 = base64ToFloat32Array(base64Data);
    if (!float32 || float32.length === 0) return;

    let sum = 0;
    for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i];
    this.aiVolumeLevel = Math.min(100, Math.round(Math.sqrt(sum / float32.length) * 350));
    this.dispatchEvent(
      new CustomEvent('volume', {
        detail: { user: this.userVolumeLevel, ai: this.aiVolumeLevel },
      })
    );

    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    if (this.outputGain) {
      source.connect(this.outputGain);
    } else {
      source.connect(this.audioContext.destination);
    }

    const currentTime = this.audioContext.currentTime;

    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
      this.speechEndTimer = null;
    }

    if (!this.isPlayingAudio || this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime + this.JITTER_BUFFER_SEC;
    }

    const wasPlaying = this.isPlayingAudio;
    source.start(this.nextPlayTime);
    this.activeSources.push(source);
    this.isPlayingAudio = true;

    if (!wasPlaying) {
      this.lastSpeechStartTime = Date.now();
      this.setState('speaking');
      this.dispatchEvent(new CustomEvent('speechstart'));
    }

    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
      if (this.activeSources.length === 0) {
        if (this.speechEndTimer) clearTimeout(this.speechEndTimer);
        this.speechEndTimer = setTimeout(() => {
          if (this.activeSources.length === 0 && this.isPlayingAudio) {
            this.isPlayingAudio = false;
            this.aiVolumeLevel = 0;
            this.setState('connected');
            this.dispatchEvent(
              new CustomEvent('volume', {
                detail: { user: this.userVolumeLevel, ai: 0 },
              })
            );
            this.scheduleTranscriptEmit(500);
            this.dispatchEvent(new CustomEvent('speechend'));
          }
        }, 180);
      }
    };

    this.nextPlayTime += audioBuffer.duration;
  }

  public interrupt(force: boolean = false) {
    if (!this.isPlayingAudio && this.activeSources.length === 0) return;

    const now = Date.now();
    if (!force && now - this.lastInterruptTime < 1200) return;
    this.lastInterruptTime = now;

    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
      this.speechEndTimer = null;
    }

    this.isPlayingAudio = false;
    this.interruptStreak = 0;
    this.aiVolumeLevel = 0;
    this.emitTranscript(true);

    this.activeSources.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    this.activeSources = [];
    this.nextPlayTime = this.audioContext?.currentTime || 0;

    this.setState('connected');
    this.dispatchEvent(new CustomEvent('speechend'));
  }

  private scheduleTranscriptEmit(delayMs: number = 600) {
    if (this.transcriptTimer) clearTimeout(this.transcriptTimer);
    this.transcriptTimer = setTimeout(() => {
      this.emitTranscript(true);
    }, delayMs);
  }

  private emitTranscript(isFinal: boolean = true) {
    if (this.transcriptTimer) {
      clearTimeout(this.transcriptTimer);
      this.transcriptTimer = null;
    }
    const text = this.currentAiTurnText.trim();
    if (text) {
      const personaConfig = getPersonaConfig(this.personaId);
      this.dispatchEvent(
        new CustomEvent('transcript', {
          detail: {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            personaName: personaConfig?.name || 'Telegram AI',
            text,
            isFinal,
            timestamp: Date.now(),
          },
        })
      );
      if (isFinal) {
        this.currentAiTurnText = '';
      }
    }
  }

  public reconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectWebSocket();
  }

  public disconnect() {
    this.isIntentionalDisconnect = true;
    if (this.speechEndTimer) clearTimeout(this.speechEndTimer);
    if (this.transcriptTimer) clearTimeout(this.transcriptTimer);

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.activeSources.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    this.activeSources = [];

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    try {
      this.processorNode?.disconnect();
      this.mixerNode?.disconnect();
      this.sourceNode?.disconnect();
      this.outputCompressor?.disconnect();
      this.outputGain?.disconnect();
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }
    } catch {}

    this.isPlayingAudio = false;
    this.userVolumeLevel = 0;
    this.aiVolumeLevel = 0;
    this.setState('disconnected');
  }

  public startCall(persona?: AIPersona, apiKey?: string): Promise<void> {
    if (persona) this.setPersona(persona);
    return this.start(apiKey);
  }

  public endCall() {
    this.disconnect();
  }

  public interruptAudio() {
    this.interrupt(true);
  }

  public resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }
}

let singletonInstance: AICallService | null = null;

export function getAICallService(persona: AIPersona = DEFAULT_AI_PERSONA, apiKey: string = ''): AICallService {
  if (!singletonInstance) {
    singletonInstance = new AICallService(persona, apiKey);
  } else {
    if (persona && singletonInstance.getPersona() !== persona) {
      singletonInstance.setPersona(persona);
    }
  }
  return singletonInstance;
}

export function createAiCall(persona: AIPersona = DEFAULT_AI_PERSONA, apiKey: string = ''): AICallService {
  if (singletonInstance) {
    singletonInstance.disconnect();
  }
  singletonInstance = new AICallService(persona, apiKey);
  return singletonInstance;
}

export function stopAiCall() {
  if (singletonInstance) {
    singletonInstance.disconnect();
    singletonInstance = null;
  }
}

export function getActiveAiCall(): AICallService | null {
  return singletonInstance;
}
