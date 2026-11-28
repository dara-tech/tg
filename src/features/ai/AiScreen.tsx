'use client';
import { useState, useMemo } from 'react';
import {
  Phone,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Check,
  X,
  Bot,
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { AI_PERSONAS } from '@/services/aiCall/personas';
import { unlockAudioPlayback } from '@/services/aiCall/sharedAudio';
import type { PersonaConfig } from '@/services/aiCall/types';
import { toast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { useDialogsStore } from '@/store/dialogs.store';
import { getCachedMessages, setCachedMessages } from '@/core/storage/messages';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'khmer', label: 'Khmer (ខ្មែរ)' },
  { id: 'tech', label: 'Tech & Code' },
  { id: 'advisor', label: 'Advisors' },
  { id: 'comedy', label: 'Fun & Casual' },
];

export default function AiScreen() {
  const router = useRouter();
  const { startAiCall, setAiPersona, aiPersona } = useUIStore();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const characterList = useMemo(() => {
    return Object.values(AI_PERSONAS).filter((p) => {
      const matchesCategory =
        activeCategory === 'all' || p.category === activeCategory;
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tagline.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleStartCall = (persona: PersonaConfig) => {
    unlockAudioPlayback();
    setAiPersona(persona.id);
    startAiCall(persona.id);
  };

  const handleStartChat = (persona: PersonaConfig) => {
    const dialogId = `ai_${persona.id}`;
    setAiPersona(persona.id);

    useDialogsStore.getState().upsertDialog({
      id: dialogId,
      title: persona.name,
      avatarColor: persona.gradient.from || '#0A84FF',
      avatarLetters: persona.gradient.initial || persona.name[0] || 'AI',
      avatarUrl: persona.avatar,
      lastMessage: persona.greeting || persona.tagline || 'Start a conversation',
      lastMessageDate: Math.floor(Date.now() / 1000),
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isOnline: true,
      peerType: 'user',
      peerId: -1,
      isAiChat: true,
      aiPersonaId: persona.id,
    });

    const cached = getCachedMessages(dialogId);
    if (cached.length === 0 && persona.greeting) {
      setCachedMessages(dialogId, [
        {
          id: Date.now(),
          text: persona.greeting,
          out: false,
          date: Date.now() / 1000,
          status: 'sent',
          sender: {
            peerId: 0,
            name: persona.name,
            letters: persona.gradient?.initial || persona.name?.[0] || 'AI',
            color: persona.gradient?.from || '#0A84FF',
            peerType: 'user',
          },
        },
      ]);
    }

    router.push(`/chat/${dialogId}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none">
      {/* ── Top Header ── */}
      <div className="px-4 pt-3 pb-3 safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/90 backdrop-blur-xl z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-tg-border/20 flex items-center justify-center bg-tg-surface p-1 shadow-sm">
              <img src="/icons/ai-brain.png" alt="AI" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-tg-text text-[20px] font-bold tracking-tight leading-tight">
                AI Assistants
              </h1>
              <p className="text-[11px] text-tg-text-hint font-medium">
                Live voice companions
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/40 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-all shadow-sm"
            aria-label="Settings"
            title="Configure AI Voice"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Search Bar */}
        <div className="relative mb-2.5">
          <Search className="w-4 h-4 text-tg-text-hint absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companions..."
            className="w-full bg-tg-surface border border-tg-border/30 rounded-xl pl-9 pr-8 py-2 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tg-text-hint hover:text-tg-text p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-tg-blue text-white shadow-sm'
                    : 'bg-tg-surface text-tg-text-secondary hover:text-tg-text border border-tg-border/20 active:scale-95'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="p-4 space-y-3.5 max-w-2xl mx-auto w-full">
        {/* ── Character Cards List ── */}
        <div className="space-y-2.5">
          {characterList.map((character) => {
            const isCurrentSelected = aiPersona === character.id;

            return (
              <div
                key={character.id}
                className={`p-3.5 rounded-2xl bg-tg-bg-secondary border transition-all ${
                  isCurrentSelected
                    ? 'border-tg-blue/50 shadow-sm'
                    : 'border-tg-border/25 hover:border-tg-border/50'
                }`}
              >
                {/* Main Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 border border-tg-border/30 bg-tg-surface shadow-xs">
                      {character.avatar ? (
                        <img
                          src={character.avatar}
                          alt={character.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-tg-text">
                          {character.gradient.initial}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1.5 ring-tg-bg" />
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-tg-text truncate">
                          {character.name}
                        </h4>
                        {isCurrentSelected && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-tg-blue/15 text-tg-blue border border-tg-blue/30 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Selected
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-tg-text-hint truncate">
                        {character.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleStartCall(character)}
                      className="py-1.5 px-3 rounded-full bg-tg-blue hover:bg-tg-blue/90 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                      title={`Call ${character.name}`}
                    >
                      <Phone className="w-3.5 h-3.5 fill-current" />
                      <span>Call</span>
                    </button>

                    <button
                      onClick={() => handleStartChat(character)}
                      className="w-8 h-8 rounded-full bg-tg-surface border border-tg-border/30 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-all"
                      title="Select companion"
                      aria-label={`Select ${character.name}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Empty State ── */}
        {characterList.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <div className="w-12 h-12 rounded-full bg-tg-surface mx-auto flex items-center justify-center text-tg-text-hint">
              <Bot className="w-6 h-6" />
            </div>
            <p className="text-tg-text text-sm font-bold">No companions found</p>
            <p className="text-tg-text-hint text-xs">Try selecting another category or clear search</p>
          </div>
        )}
      </div>
    </div>
  );
}
