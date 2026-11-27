'use client';
import { useState, useEffect } from 'react';
import { Mic, MicOff, PhoneOff, Smartphone, Volume2, Users, X } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { createAiCall, stopAiCall, getActiveAiCall } from '@/services/aiCall/aiCallService';
import { AI_PERSONAS, getPersonaConfig } from '@/services/aiCall/personas';
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

  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [aiState, setAiState] = useState<AIState>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [userVol, setUserVol] = useState<number>(0);
  const [aiVol, setAiVol] = useState<number>(0);
  const [showPicker, setShowPicker] = useState<boolean>(false);

  const personaConfig = getPersonaConfig(aiPersona);

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
    ? personaConfig?.name || 'Telegram AI'
    : activeCallName || `User ${activeCallId}`;
  const initials = isAiCall
    ? personaConfig?.gradient?.initial || 'AI'
    : displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';

  const currentVolume = aiState === 'speaking' ? aiVol : userVol;
  const pulseScale = 1 + Math.min(0.35, currentVolume * 0.45);

  return (
    <div className="fixed inset-0 z-[100] bg-tg-bg/95 text-tg-text backdrop-blur-3xl flex flex-col justify-between items-center px-6 py-10 safe-top safe-bottom select-none overflow-hidden transition-colors">
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
        {/* Animated Avatar */}
        <div className="relative flex items-center justify-center">
          {/* Subtle audio ripple */}
          {isAiCall && (aiState === 'speaking' || (aiState === 'listening' && userVol > 0.05)) && (
            <>
              <div
                className="absolute rounded-full border border-tg-blue/30 pointer-events-none transition-transform duration-100"
                style={{
                  width: `${148 * pulseScale}px`,
                  height: `${148 * pulseScale}px`,
                }}
              />
              <div
                className="absolute rounded-full bg-tg-blue/10 pointer-events-none transition-transform duration-150"
                style={{
                  width: `${176 * pulseScale}px`,
                  height: `${176 * pulseScale}px`,
                }}
              />
            </>
          )}

          <div
            onClick={isAiCall && aiState === 'speaking' ? handleInterrupt : undefined}
            className="relative w-32 h-32 rounded-full overflow-hidden border border-tg-border/30 shadow-xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 bg-tg-surface"
          >
            {isAiCall && personaConfig?.avatar ? (
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

        {/* Name & Clean Status */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-tg-text">{displayName}</h2>
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
