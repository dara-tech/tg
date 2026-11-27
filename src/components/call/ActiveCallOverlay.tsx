'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Smartphone, Volume2, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
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
  const [transcriptSpeaker, setTranscriptSpeaker] = useState<'ai' | 'user'>('ai');
  const [userVol, setUserVol] = useState<number>(0);
  const [aiVol, setAiVol] = useState<number>(0);
  const [showPersonaPicker, setShowPersonaPicker] = useState<boolean>(false);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);

  const selectedPersonaConfig = getPersonaConfig(aiPersona as AIPersona);

  // Timer
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
    setTranscript(selectedPersonaConfig.greeting);
    setTranscriptSpeaker('ai');

    const service = createAiCall(aiPersona as AIPersona, aiApiKey);

    const handleStateChange = (e: Event) => {
      const state = (e as CustomEvent<AIState>).detail;
      setAiState(state);
    };

    const handleTranscript = (e: Event) => {
      const detail = (e as CustomEvent<any>).detail;
      if (detail && detail.text) {
        setTranscript(detail.text);
        setTranscriptSpeaker(detail.speaker || detail.sender || 'ai');
      }
    };

    const handleVolume = (e: Event) => {
      const d = (e as CustomEvent<any>).detail;
      if (d) {
        setUserVol(d.userVolume ?? (d.user ? d.user / 100 : 0));
        setAiVol(d.aiVolume ?? (d.ai ? d.ai / 100 : 0));
      }
    };

    const handleError = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      setErrorMessage(msg);
      setAiState('error');
    };

    service.addEventListener('statechange', handleStateChange);
    service.addEventListener('transcript', handleTranscript);
    service.addEventListener('volume', handleVolume);
    service.addEventListener('error', handleError);

    service.startCall(aiPersona as AIPersona, aiApiKey);

    return () => {
      service.removeEventListener('statechange', handleStateChange);
      service.removeEventListener('transcript', handleTranscript);
      service.removeEventListener('volume', handleVolume);
      service.removeEventListener('error', handleError);
      service.endCall();
    };
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
    setShowPersonaPicker(false);
  };

  const handleInterruptAi = () => {
    const active = getActiveAiCall();
    if (active) active.interruptAudio();
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const displayName = isAiCall ? selectedPersonaConfig.name : activeCallName || `User ${activeCallId}`;
  const initials = isAiCall
    ? selectedPersonaConfig.gradient.initial
    : displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';

  // Dynamic wave scale
  const currentVolume = aiState === 'speaking' ? aiVol : userVol;
  const pulseScale = 1 + Math.min(0.4, currentVolume * 0.5);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex flex-col justify-between items-center px-6 py-12 safe-top safe-bottom select-none overflow-hidden backdrop-blur-2xl">
      {/* Background Ambient Glow */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[120px] pointer-events-none opacity-40 transition-colors duration-700"
        style={{
          backgroundColor: isAiCall
            ? aiState === 'speaking'
              ? '#06b6d4'
              : aiState === 'listening'
              ? '#10b981'
              : '#6366f1'
            : '#0284c7',
        }}
      />

      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {isAiCall && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold tracking-wide text-sky-300">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              AI Voice Call
            </span>
          )}
        </div>

        {isAiCall && (
          <button
            onClick={() => setShowPersonaPicker((v) => !v)}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 border border-white/15 text-xs font-medium text-white/90 transition-all flex items-center gap-1.5"
          >
            <span>Change Companion</span>
            <span className="text-[10px] opacity-60">▼</span>
          </button>
        )}
      </div>

      {/* Main Center Avatar Area */}
      <div className="flex flex-col items-center gap-6 my-auto z-10 w-full max-w-sm">
        {/* Avatar with Soundwave Rings */}
        <div className="relative flex items-center justify-center">
          {/* Animated Wave Rings */}
          {isAiCall && (aiState === 'speaking' || (aiState === 'listening' && userVol > 0.05)) && (
            <>
              <div
                className="absolute rounded-full border-2 border-sky-400/30 animate-ping pointer-events-none"
                style={{
                  width: `${140 * pulseScale}px`,
                  height: `${140 * pulseScale}px`,
                  animationDuration: '2s',
                }}
              />
              <div
                className="absolute rounded-full bg-sky-500/10 pointer-events-none transition-transform duration-75"
                style={{
                  width: `${170 * pulseScale}px`,
                  height: `${170 * pulseScale}px`,
                }}
              />
            </>
          )}

          {/* Avatar Container */}
          <div
            onClick={isAiCall && aiState === 'speaking' ? handleInterruptAi : undefined}
            className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl flex items-center justify-center cursor-pointer transition-transform active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${selectedPersonaConfig.gradient.from}, ${selectedPersonaConfig.gradient.to})`,
            }}
          >
            {isAiCall && selectedPersonaConfig.avatar ? (
              <img
                src={selectedPersonaConfig.avatar}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-4xl font-bold tracking-tight text-white/90">{initials}</span>
            )}

            {/* Muted overlay badge */}
            {muted && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <MicOff className="w-8 h-8 text-rose-400" />
              </div>
            )}
          </div>
        </div>

        {/* Name & Tagline */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{displayName}</h2>
          <p className="text-xs text-white/60">
            {isAiCall ? selectedPersonaConfig.tagline : 'Telegram Voice Call'}
          </p>

          {/* State Indicator */}
          <div className="pt-2 flex items-center justify-center gap-2">
            {isAiCall ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium">
                {aiState === 'connecting' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-300">Connecting to AI...</span>
                  </>
                )}
                {aiState === 'listening' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300">Listening to you</span>
                  </>
                )}
                {aiState === 'speaking' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span className="text-sky-300">Speaking...</span>
                  </>
                )}
                {aiState === 'error' && (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-300">Connection Failed</span>
                  </>
                )}
                <span className="text-white/40">·</span>
                <span className="text-white/70">{fmt(duration)}</span>
              </div>
            ) : (
              <p className="text-white/70 text-sm font-medium">{fmt(duration)}</p>
            )}
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs text-center max-w-xs animate-shake">
            {errorMessage}
          </div>
        )}

        {/* Live Real-time Transcript Bubble */}
        {isAiCall && transcript && showSubtitles && (
          <div
            onClick={aiState === 'speaking' ? handleInterruptAi : undefined}
            className="w-full max-h-28 overflow-y-auto px-4 py-3 rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/10 text-center shadow-lg transition-all cursor-pointer hover:bg-white/[0.12]"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1 text-[10px] uppercase font-bold tracking-wider text-sky-300/80">
              <MessageSquare className="w-3 h-3" />
              <span>{transcriptSpeaker === 'ai' ? selectedPersonaConfig.name : 'You'}</span>
            </div>
            <p className="text-sm font-medium text-white/90 leading-relaxed break-words">
              {transcript}
            </p>
            {aiState === 'speaking' && (
              <span className="text-[10px] text-white/40 mt-1 block">Tap avatar or text to interrupt</span>
            )}
          </div>
        )}
      </div>

      {/* Persona Quick Picker Drawer (when toggled) */}
      {showPersonaPicker && isAiCall && (
        <div className="w-full max-w-md p-4 rounded-3xl bg-slate-900/95 border border-white/15 backdrop-blur-xl mb-4 shadow-2xl z-30 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">
              Select AI Companion
            </h3>
            <button
              onClick={() => setShowPersonaPicker(false)}
              className="text-xs text-white/50 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {Object.values(AI_PERSONAS).map((p) => {
              const isCurrent = p.id === aiPersona;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSwitchPersona(p.id)}
                  className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                    isCurrent
                      ? 'bg-sky-600/30 border border-sky-400/40 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 border border-white/5 text-white/80'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${p.gradient.from}, ${p.gradient.to})`,
                    }}
                  >
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.gradient.initial
                    )}
                  </div>
                  <div className="truncate min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight">{p.name}</p>
                    <p className="text-[10px] text-white/50 truncate leading-tight">{p.tagline}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Call Controls */}
      <div className="w-full max-w-md flex justify-around items-center pt-4 z-10">
        {/* Mute Button */}
        <CallControlBtn
          icon={muted ? <MicOff className="w-6 h-6 text-rose-300" /> : <Mic className="w-6 h-6 text-white" />}
          label={muted ? 'Unmute' : 'Mute'}
          active={muted}
          onClick={handleToggleMute}
        />

        {/* End Call Button */}
        <button
          onClick={handleEndCall}
          className="w-20 h-20 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 flex items-center justify-center shadow-2xl transition-all border-4 border-slate-900"
          aria-label="End Call"
        >
          <PhoneOff className="w-8 h-8 text-white fill-white" />
        </button>

        {/* Subtitles Toggle or Speaker Button */}
        {isAiCall ? (
          <CallControlBtn
            icon={<MessageSquare className={`w-6 h-6 ${showSubtitles ? 'text-sky-300' : 'text-white/60'}`} />}
            label={showSubtitles ? 'Captions' : 'Mute Captions'}
            active={showSubtitles}
            onClick={() => setShowSubtitles((v) => !v)}
          />
        ) : (
          <CallControlBtn
            icon={speaker ? <Volume2 className="w-6 h-6 text-white" /> : <Smartphone className="w-6 h-6 text-white" />}
            label={speaker ? 'Speaker' : 'Earpiece'}
            active={speaker}
            onClick={() => setSpeaker((v) => !v)}
          />
        )}
      </div>
    </div>
  );
}

function CallControlBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
    >
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
          active
            ? 'bg-white/25 border border-white/30 text-white shadow-lg'
            : 'bg-white/10 hover:bg-white/15 border border-white/10 text-white/80'
        }`}
      >
        {icon}
      </div>
      <span className="text-white/70 text-xs font-medium group-hover:text-white transition-colors">
        {label}
      </span>
    </button>
  );
}
