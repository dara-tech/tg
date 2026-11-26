'use client';
import { useState, useEffect } from 'react';
import { Mic, MicOff, PhoneOff, Smartphone, Volume2 } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';

export function ActiveCallOverlay() {
  const { activeCallId, activeCallName, setActiveCall } = useUIStore();
  const [duration, setDuration] = useState(0);
  const [muted, setMuted]       = useState(false);
  const [speaker, setSpeaker]   = useState(false);

  useEffect(() => {
    if (!activeCallId) { setDuration(0); return; }
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [activeCallId]);

  if (!activeCallId) return null;

  const displayName = activeCallName || `User ${activeCallId}`;
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-tg-blue to-tg-bg-tertiary flex flex-col items-center justify-between py-16 safe-top safe-bottom">
      <div className="flex flex-col items-center gap-4">
        <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold text-white">
          {initials}
        </div>
        <h2 className="text-white text-2xl font-bold">{displayName}</h2>
        <p className="text-white/70 text-sm">{fmt(duration)}</p>
      </div>

      <div className="flex gap-8 items-center">
        <CallBtn
          icon={muted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          label={muted ? 'Unmute' : 'Mute'}
          active={muted}
          onClick={() => setMuted(v => !v)}
        />
        <button
          onClick={() => setActiveCall(null)}
          className="w-20 h-20 rounded-full bg-tg-red flex items-center justify-center active:opacity-80 shadow-xl"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>
        <CallBtn
          icon={speaker ? <Volume2 className="w-6 h-6 text-white" /> : <Smartphone className="w-6 h-6 text-white" />}
          label={speaker ? 'Speaker' : 'Earpiece'}
          active={speaker}
          onClick={() => setSpeaker(v => !v)}
        />
      </div>
    </div>
  );
}

function CallBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${active ? 'bg-white/30' : 'bg-white/15'}`}>
        {icon}
      </div>
      <span className="text-white/75 text-xs">{label}</span>
    </button>
  );
}
