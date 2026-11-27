'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Smartphone, Volume2, Users, X, Sparkles } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { usePersonaStore } from '@/store/persona.store';
import { createAiCall, stopAiCall, getActiveAiCall } from '@/services/aiCall/aiCallService';
import { AI_PERSONAS, getPersonaConfig } from '@/services/aiCall/personas';
import { unlockAudioPlayback } from '@/services/aiCall/sharedAudio';
import type { AIPersona, AIState, AiTranscriptEvent } from '@/services/aiCall/types';

export function ActiveCallOverlay() {
  const {
    activeCallId,
    activeCallName,
    isAiCall,
    aiPersona,
    aiApiKey,
    setActiveCall,
    setAiPersona,
  } = useUIStore();
  const { customs: customPersonas } = usePersonaStore();

  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [aiState, setAiState] = useState<AIState>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [userVol, setUserVol] = useState<number>(0);
  const [aiVol, setAiVol] = useState<number>(0);
  const [showPicker, setShowPicker] = useState<boolean>(false);

  // Smooth Wire-Signal Animation (60FPS GPU lerp)
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const ring3Ref = useRef<HTMLDivElement>(null);
  const targetVolRef = useRef(0);
  const currentVolRef = useRef(0);
  // Stable refs so the single RAF loop always reads current values
  const isAiCallRef = useRef(isAiCall);
  const aiStateRef = useRef(aiState);

  const personaConfig = getPersonaConfig(aiPersona);
  const customPersonaConfig = customPersonas.find((c) => c.id === aiPersona);

  // Keep refs in sync — no RAF restart needed
  useEffect(() => { isAiCallRef.current = isAiCall; }, [isAiCall]);
  useEffect(() => { aiStateRef.current = aiState; }, [aiState]);

  // Sync target volume with smooth lerp target
  useEffect(() => {
    targetVolRef.current = aiState === 'speaking' ? aiVol : aiState === 'listening' ? userVol : 0;
  }, [aiVol, userVol, aiState]);

  // Single long-lived 60fps RAF loop — empty deps, reads from refs
  useEffect(() => {
    let animId: number;
    let t = 0;

    const tick = () => {
      t += 0.04;
      // Exponential linear interpolation (lerp)
      currentVolRef.current += (targetVolRef.current - currentVolRef.current) * 0.16;
      const v = Math.max(0, currentVolRef.current);

      const isTalking = v > 0.02;
      const breath = Math.sin(t) * 0.012;
      const curState = aiStateRef.current;
      const active = isAiCallRef.current && (curState === 'speaking' || curState === 'listening' || curState === 'connected');

      if (ring1Ref.current) {
        const s1 = 1 + v * 0.35 + (isTalking ? 0.03 : breath);
        const op1 = active ? Math.min(0.85, 0.18 + v * 0.7) : 0;
        ring1Ref.current.style.transform = `scale(${s1.toFixed(3)})`;
        ring1Ref.current.style.opacity = op1.toFixed(3);
      }

      if (ring2Ref.current) {
        const s2 = 1 + v * 0.62 + (isTalking ? 0.06 : breath * 1.6);
        const op2 = active ? Math.min(0.6, 0.1 + v * 0.5) : 0;
        ring2Ref.current.style.transform = `scale(${s2.toFixed(3)})`;
        ring2Ref.current.style.opacity = op2.toFixed(3);
      }

      if (ring3Ref.current) {
        const s3 = 1 + v * 0.95 + (isTalking ? 0.1 : breath * 2.2);
        const op3 = active ? Math.min(0.4, v * 0.35) : 0;
        ring3Ref.current.style.transform = `scale(${s3.toFixed(3)})`;
        ring3Ref.current.style.opacity = op3.toFixed(3);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []); // ← empty deps: one loop for the component's lifetime

  // Call duration timer
  useEffect(() => {
    if (!activeCallId) {
      setDuration(0);
      return;
    }
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [activeCallId]);

  // AI Call Lifecycle
  useEffect(() => {
    if (!activeCallId || !isAiCall) {
      stopAiCall();
      return;
    }

    setAiState('connecting');
    setErrorMessage(null);
    setTranscript('');

    let service: ReturnType<typeof createAiCall> | null = null;

    try {
      service = createAiCall((aiPersona || 'telegram').toLowerCase() as AIPersona, aiApiKey);

      const handleStateChange = (e: Event) => {
        setAiState((e as CustomEvent<AIState>).detail);
      };

      const handleTranscript = (e: Event) => {
        const detail = (e as CustomEvent<Partial<AiTranscriptEvent> | string>).detail;
        const text = typeof detail === 'string' ? detail : detail?.text ?? '';
        if (text) setTranscript(text);
      };

      const handleVolume = (e: Event) => {
        const detail = (e as CustomEvent<{ user?: number; ai?: number; userVolume?: number; aiVolume?: number }>).detail;
        const uRaw = detail?.userVolume ?? detail?.user ?? 0;
        const aRaw = detail?.aiVolume ?? detail?.ai ?? 0;
        setUserVol(Math.min(1, (Number.isFinite(uRaw) ? uRaw : 0) / 100));
        setAiVol(Math.min(1, (Number.isFinite(aRaw) ? aRaw : 0) / 100));
      };

      const handleError = (e: Event) => {
        const detail = (e as CustomEvent<string | { message?: string }>).detail;
        const msg =
          typeof detail === 'string'
            ? detail
            : detail && typeof detail === 'object' && typeof detail.message === 'string'
            ? detail.message
            : 'Call connection failed';
        setErrorMessage(msg);
        setAiState('error');
      };

      service.addEventListener('statechange', handleStateChange);
      service.addEventListener('transcript', handleTranscript);
      service.addEventListener('volume', handleVolume);
      service.addEventListener('error', handleError);

      Promise.resolve(service.startCall((aiPersona || 'telegram').toLowerCase() as AIPersona, aiApiKey)).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Unable to start audio stream';
        console.warn('[ActiveCallOverlay] StartCall error:', msg);
        setErrorMessage(msg);
        setAiState('error');
      });

      return () => {
        if (service) {
          service.removeEventListener('statechange', handleStateChange);
          service.removeEventListener('transcript', handleTranscript);
          service.removeEventListener('volume', handleVolume);
          service.removeEventListener('error', handleError);
          service.endCall();
        }
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Audio initialization error';
      console.error('[ActiveCallOverlay] Lifecycle exception:', err);
      setErrorMessage(msg);
      setAiState('error');
    }
  }, [activeCallId, isAiCall, aiPersona, aiApiKey]);

  if (!activeCallId) return null;

  const handleEndCall = () => {
    stopAiCall();
    setActiveCall(null);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    const active = getActiveAiCall();
    if (active) active.setMuted(next);
  };

  const handleSwitchPersona = (pId: AIPersona) => {
    setAiPersona(pId);
    setShowPicker(false);
  };

  const handleInterrupt = () => {
    const active = getActiveAiCall();
    if (active) active.interruptAudio();
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const displayName = isAiCall
    ? customPersonaConfig?.name || personaConfig?.name || 'Telegram AI'
    : activeCallName || `User ${activeCallId}`;
  const initials = isAiCall
    ? customPersonaConfig?.avatarEmoji || personaConfig?.gradient?.initial || 'AI'
    : displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <div
      onClick={() => {
        unlockAudioPlayback();
        getActiveAiCall()?.resumeAudioContext();
      }}
      className="fixed inset-0 z-[100] bg-tg-bg/95 text-tg-text backdrop-blur-3xl flex flex-col justify-between items-center px-6 py-10 safe-top safe-bottom select-none overflow-hidden transition-colors"
    >
      {/* Top clean bar */}
      <div className="w-full max-w-sm flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-1.5 text-xs text-tg-text-hint font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{fmt(duration)}</span>
        </div>

        {isAiCall && (
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="w-8 h-8 rounded-full bg-tg-surface border border-tg-border/40 flex items-center justify-center text-tg-text-secondary active:scale-95 transition-transform"
            aria-label="Switch Companion"
          >
            <Users className="w-4 h-4 text-tg-text-secondary" />
          </button>
        )}
      </div>

      {/* Hero Center */}
      <div className="flex flex-col items-center gap-5 my-auto z-10 w-full max-w-sm">
        {/* Animated Avatar with Hardware-Accelerated Smooth Wire-Signal Waves */}
        <div className="relative flex items-center justify-center w-48 h-48">
          {/* Wire-Signal Wave 3 (Outer ambient aura) */}
          <div
            ref={ring3Ref}
            className={`absolute w-32 h-32 rounded-full border pointer-events-none transition-colors duration-500 ${
              aiState === 'listening'
                ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                : 'border-tg-blue/20 bg-tg-blue/[0.03]'
            }`}
            style={{ willChange: 'transform, opacity' }}
          />

          {/* Wire-Signal Wave 2 (Middle harmonic wave) */}
          <div
            ref={ring2Ref}
            className={`absolute w-32 h-32 rounded-full border pointer-events-none transition-colors duration-300 ${
              aiState === 'listening'
                ? 'border-emerald-500/35 bg-emerald-500/[0.06]'
                : 'border-tg-blue/35 bg-tg-blue/[0.06]'
            }`}
            style={{ willChange: 'transform, opacity' }}
          />

          {/* Wire-Signal Wave 1 (Inner responsive wire) */}
          <div
            ref={ring1Ref}
            className={`absolute w-32 h-32 rounded-full border-2 pointer-events-none transition-colors duration-200 ${
              aiState === 'listening'
                ? 'border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                : 'border-tg-blue/60 shadow-[0_0_20px_rgba(59,130,246,0.25)]'
            }`}
            style={{ willChange: 'transform, opacity' }}
          />

          <div
            onClick={isAiCall && aiState === 'speaking' ? handleInterrupt : undefined}
            className="relative w-32 h-32 rounded-full overflow-hidden border border-tg-border/30 shadow-2xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 bg-tg-surface z-10"
          >
            {isAiCall && customPersonaConfig?.avatarImage ? (
              <img
                src={customPersonaConfig.avatarImage}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : isAiCall && customPersonaConfig ? (
              <div
                className="w-full h-full flex items-center justify-center text-5xl"
                style={{ background: `linear-gradient(135deg, ${customPersonaConfig.gradientFrom}, ${customPersonaConfig.gradientTo})` }}
              >
                {customPersonaConfig.avatarEmoji}
              </div>
            ) : isAiCall && personaConfig?.avatar ? (
              <img
                src={personaConfig.avatar}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-3xl font-bold text-tg-text">{initials}</span>
            )}

            {muted && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                <MicOff className="w-7 h-7 text-tg-red" />
              </div>
            )}
          </div>
        </div>

        {/* Name & Clean Status with Live Wire-Signal Indicator */}
        <div className="text-center space-y-1.5 flex flex-col items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-tg-text">{displayName}</h2>
            {isAiCall && (
              <span className="p-1 rounded-full bg-gradient-to-tr from-purple-500/20 to-sky-500/20 border border-purple-500/40 text-purple-400">
                <Sparkles className="w-3.5 h-3.5 fill-purple-400/20" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Smooth live signal waveform bars */}
            {isAiCall && (aiState === 'speaking' || aiState === 'listening') && (
              <div className="flex items-center gap-0.5 h-3 px-1">
                <span
                  className={`w-0.5 rounded-full ${
                    aiState === 'listening' ? 'bg-emerald-500' : 'bg-tg-blue'
                  } animate-pulse`}
                  style={{ height: '55%', animationDuration: '0.6s' }}
                />
                <span
                  className={`w-0.5 rounded-full ${
                    aiState === 'listening' ? 'bg-emerald-500' : 'bg-tg-blue'
                  } animate-pulse`}
                  style={{ height: '100%', animationDuration: '0.4s' }}
                />
                <span
                  className={`w-0.5 rounded-full ${
                    aiState === 'listening' ? 'bg-emerald-500' : 'bg-tg-blue'
                  } animate-pulse`}
                  style={{ height: '75%', animationDuration: '0.7s' }}
                />
                <span
                  className={`w-0.5 rounded-full ${
                    aiState === 'listening' ? 'bg-emerald-500' : 'bg-tg-blue'
                  } animate-pulse`}
                  style={{ height: '40%', animationDuration: '0.5s' }}
                />
              </div>
            )}
            <p className="text-xs text-tg-text-hint font-medium">
              {isAiCall
                ? aiState === 'connecting'
                  ? 'connecting...'
                  : aiState === 'speaking'
                  ? 'speaking...'
                  : aiState === 'listening'
                  ? 'listening...'
                  : aiState === 'error'
                  ? 'connection failed'
                  : 'connected'
                : 'telegram call'}
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <p className="text-xs text-tg-red px-3 py-1.5 rounded-lg bg-tg-red/10 border border-tg-red/20 text-center max-w-xs">
            {errorMessage}
          </p>
        )}

        {/* Minimal Floating Subtitles */}
        {isAiCall && transcript && (
          <div
            onClick={aiState === 'speaking' ? handleInterrupt : undefined}
            className="w-full max-h-24 overflow-y-auto px-4 py-2.5 rounded-2xl text-center cursor-pointer"
          >
            <p className="text-sm text-tg-text/90 leading-relaxed font-medium">
              "{transcript}"
            </p>
          </div>
        )}
      </div>

      {/* Companion Switcher Modal */}
      {showPicker && isAiCall && (
        <div className="w-full max-w-sm p-4 rounded-3xl bg-tg-bg-secondary border border-tg-border/30 shadow-2xl mb-4 z-30 animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold text-tg-text-hint">Companions</span>
            <button
              onClick={() => setShowPicker(false)}
              className="text-tg-text-hint hover:text-tg-text p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {Object.values(AI_PERSONAS).map((p) => {
              const isCurrent = p.id === aiPersona;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSwitchPersona(p.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all ${
                    isCurrent
                      ? 'bg-tg-blue/15 border border-tg-blue/40 text-tg-text'
                      : 'bg-tg-surface border border-tg-border/20 text-tg-text hover:bg-tg-surface/80'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-tg-bg border border-tg-border/20 flex items-center justify-center text-xs font-bold">
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.gradient?.initial || 'AI'
                    )}
                  </div>
                  <span className="text-xs font-medium truncate">{p.name}</span>
                </button>
              );
            })}
            {/* Custom personas */}
            {customPersonas.map((p) => {
              const isCurrent = p.id === aiPersona;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSwitchPersona(p.id as AIPersona)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all ${
                    isCurrent
                      ? 'bg-tg-blue/15 border border-tg-blue/40 text-tg-text'
                      : 'bg-tg-surface border border-tg-border/20 text-tg-text hover:bg-tg-surface/80'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-base overflow-hidden"
                    style={p.avatarImage ? {} : { background: `linear-gradient(135deg, ${p.gradientFrom}, ${p.gradientTo})` }}
                  >
                    {p.avatarImage ? (
                      <img src={p.avatarImage} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.avatarEmoji
                    )}
                  </div>
                  <span className="text-xs font-medium truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="w-full max-w-sm flex justify-around items-center pt-2 z-10 pb-4">
        {/* Mute */}
        <button
          onClick={handleToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-all border ${
            muted
              ? 'bg-tg-surface border-tg-red/40 text-tg-red'
              : 'bg-tg-surface border-tg-border/30 text-tg-text'
          }`}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="w-18 h-18 w-[68px] h-[68px] rounded-full bg-tg-red hover:opacity-90 active:scale-90 flex items-center justify-center shadow-xl transition-all"
          aria-label="End Call"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>

        {/* Speaker or Companion Switch */}
        {isAiCall ? (
          <button
            onClick={() => setShowPicker((v) => !v)}
            className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-all border ${
              showPicker
                ? 'bg-tg-blue text-white border-tg-blue'
                : 'bg-tg-surface border-tg-border/30 text-tg-text'
            }`}
            aria-label="Switch Companion"
          >
            <Users className="w-5 h-5 text-tg-text" />
          </button>
        ) : (
          <button
            onClick={() => setSpeaker((v) => !v)}
            className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-all border ${
              speaker
                ? 'bg-tg-surface border-tg-blue/40 text-tg-blue'
                : 'bg-tg-surface border-tg-border/30 text-tg-text'
            }`}
            aria-label={speaker ? 'Speaker' : 'Earpiece'}
          >
            {speaker ? <Volume2 className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
          </button>
        )}
      </div>
    </div>
  );
}
