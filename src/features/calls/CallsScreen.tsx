'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, Phone, Plus, Bot } from 'lucide-react';
import { Avatar }      from '@/components/ui/Avatar';
import { DialogSkeletonList } from '@/components/ui/Skeleton';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useUIStore }  from '@/store/ui.store';
import { useDialogsStore } from '@/store/dialogs.store';
import { toast }       from '@/components/ui/Toast';
import { fetchRealCallHistory, fetchRealContacts, isMTProtoConfigured } from '@/services/telegram.real';
import { format, isToday } from 'date-fns';
import { getPersonaConfig } from '@/services/aiCall/personas';
import type { AIPersona } from '@/services/aiCall/types';

function formatCallTime(ts: number) {
  const d = new Date(ts * 1000);
  return isToday(d) ? format(d, 'HH:mm') : format(d, 'MMM d');
}

export default function CallsScreen() {
  const router = useRouter();
  const { setActiveCall, startAiCall, aiPersona } = useUIStore();
  const currentPersona = getPersonaConfig(aiPersona as AIPersona);
  const { calls, contacts, setCalls, setContacts } = useDialogsStore();
  const [loading, setLoading] = useState(() => calls.length === 0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!isMTProtoConfigured()) {
      setLoading(false);
      return;
    }
    fetchRealCallHistory()
      .then(setCalls)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setCalls]);

  const openNewCall = () => {
    setPickerOpen(true);
    if (isMTProtoConfigured() && contacts.length === 0) {
      fetchRealContacts().then(setContacts).catch(() => {});
    }
  };

  const startCall = (peerId: number, name: string) => {
    setPickerOpen(false);
    toast(`Calling ${name}...`);
    setActiveCall(peerId, name);
  };

  return (
    <div className="flex flex-col h-full bg-tg-bg">
      <div className="flex items-center justify-between px-4 pt-3 pb-3 safe-top border-b border-tg-border/20 [data-theme='manga']_&:border-b-0 shrink-0">
        <h1 className="text-tg-text text-[26px] font-bold tracking-tight">Calls</h1>
        <button
          onClick={openNewCall}
          className="w-9 h-9 rounded-full bg-tg-bg-secondary border border-tg-border/40 flex items-center justify-center text-tg-blue active:scale-95 transition-transform"
          aria-label="New Call"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
        {/* AI Voice Call Hero Banner */}
        <div className="p-3 mx-4 my-2.5 rounded-2xl bg-gradient-to-r from-sky-500/15 via-indigo-500/15 to-purple-500/15 border border-sky-500/20 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold shadow-md"
              style={{
                background: `linear-gradient(135deg, ${currentPersona.gradient.from}, ${currentPersona.gradient.to})`,
              }}
            >
              {currentPersona.avatar ? (
                <img src={currentPersona.avatar} alt={currentPersona.name} className="w-full h-full object-cover" />
              ) : (
                currentPersona.gradient.initial
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-tg-text truncate">{currentPersona.name}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-semibold flex items-center gap-0.5">
                  <Bot className="w-2.5 h-2.5" /> AI Live
                </span>
              </div>
              <p className="text-[11px] text-tg-text-hint truncate mt-0.5">{currentPersona.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => startAiCall()}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1 shadow-md shadow-sky-500/20"
            >
              <span>Call</span>
            </button>
            <button
              onClick={() => router.push('/ai')}
              className="px-2.5 py-1.5 rounded-full bg-tg-surface hover:bg-tg-border/50 text-tg-text text-xs font-medium active:scale-95 transition-all border border-tg-border/30"
            >
              <span>All AI</span>
            </button>
          </div>
        </div>

        {loading && calls.length === 0 && <DialogSkeletonList count={5} />}
        {!loading && calls.length === 0 && (
          <p className="text-tg-text-hint text-sm text-center mt-16">No recent calls</p>
        )}
        {calls.map(call => (
          <div key={call.id} className="flex items-center gap-3 px-4 py-3 active:bg-tg-surface transition-colors">
            <Avatar letters={call.name.split(' ').map(w => w[0]).join('')} color={call.color} />
            <div className="flex-1 min-w-0 text-left">
              <p className={`font-medium text-sm truncate ${call.missed ? 'text-tg-red' : 'text-tg-text'}`}>
                {call.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-tg-text-hint text-xs">
                {call.type === 'incoming' ? (
                  <ArrowDownLeft className={`w-3.5 h-3.5 ${call.missed ? 'text-tg-red' : 'text-emerald-500'}`} />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5 text-tg-blue" />
                )}
                <span suppressHydrationWarning>
                  {formatCallTime(call.date)}
                  {call.duration ? ` · ${call.duration}` : call.missed ? ' · Missed' : ''}
                </span>
              </div>
            </div>
            <button
              onClick={() => startCall(call.peerId, call.name)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-tg-blue/10 text-tg-blue active:scale-95 transition-transform shrink-0"
              aria-label={`Call ${call.name}`}
            >
              <Phone className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="New Call">
        <div className="max-h-72 overflow-y-auto px-4 pb-6 space-y-1">
          {contacts.length === 0 && (
            <p className="text-tg-text-hint text-sm text-center py-6">No contacts available</p>
          )}
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => startCall(c.id, c.name)}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl active:bg-tg-surface text-left"
            >
              <Avatar letters={c.letters} color={c.color} size="sm" />
              <span className="text-tg-text text-sm font-medium flex-1 truncate">{c.name}</span>
              <span className="text-tg-blue text-xs font-semibold">Call</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
