'use client';
import { useState, useMemo } from 'react';
import { Sparkles, Phone, MessageSquare, Search, SlidersHorizontal, Volume2, ShieldCheck, Zap } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { AI_PERSONAS } from '@/services/aiCall/personas';
import type { AIPersona, PersonaConfig } from '@/services/aiCall/types';
import { toast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { id: 'all', label: 'All Characters' },
  { id: 'khmer', label: 'Khmer (ខ្មែរ)' },
  { id: 'tech', label: 'Tech & Dev' },
  { id: 'comedy', label: 'Comedy & Memes' },
  { id: 'advisor', label: 'Advisors' },
  { id: 'general', label: 'Assistants' },
];

export default function AiScreen() {
  const router = useRouter();
  const { startAiCall, setAiPersona } = useUIStore();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const characterList = useMemo(() => {
    return Object.values(AI_PERSONAS).filter((p) => {
      const matchesCategory =
        activeCategory === 'all' || p.category === activeCategory;
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const featured = AI_PERSONAS.bopha || Object.values(AI_PERSONAS)[0];

  const handleStartCall = (persona: PersonaConfig) => {
    setAiPersona(persona.id);
    startAiCall(persona.id);
    toast(`Connecting voice call with ${persona.name}...`, 'info');
  };

  const handleStartChat = (persona: PersonaConfig) => {
    setAiPersona(persona.id);
    toast(`Starting chat with ${persona.name}...`, 'info');
    // Direct to saved messages or assistant dialog
    router.push('/dialogs');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-20 select-none">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-3 safe-top border-b border-tg-border/20 [data-theme='manga']_&:border-b-0 sticky top-0 bg-tg-bg/90 backdrop-blur-xl z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-tg-text text-[26px] font-bold tracking-tight">AI Characters</h1>
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-500/20 to-purple-500/20 text-sky-400 border border-sky-400/30 text-[11px] font-semibold flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3 text-sky-400 animate-pulse" /> Live Voice
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-tg-text-hint absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search character by name, topic or language..."
            className="w-full bg-tg-bg-secondary border border-tg-border/40 rounded-xl pl-9.5 pr-4 py-2 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue transition-colors"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-tg-blue text-white shadow-sm'
                    : 'bg-tg-surface text-tg-text-secondary hover:text-tg-text active:scale-95'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-5 max-w-4xl mx-auto w-full">
        {/* Featured Hero Banner */}
        {activeCategory === 'all' && searchQuery === '' && (
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-black border border-white/10 p-5 shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
              {/* Avatar with Sound Ripple effect */}
              <div className="relative shrink-0 flex items-center justify-center">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl p-0.5 bg-gradient-to-tr from-pink-500 to-sky-400">
                  <img
                    src={featured.avatar}
                    alt={featured.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> Online
                </div>
              </div>

              {/* Info & Call-to-Action */}
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-sky-300 text-[10px] font-semibold uppercase tracking-wider">
                    Featured Companion
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/70 text-[10px] font-mono flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-sky-400" /> Voice: {featured.voice}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {featured.name}
                </h2>
                <p className="text-xs text-white/70 max-w-md">
                  {featured.description || featured.tagline}
                </p>

                {/* Speech Preview Quote */}
                <div className="inline-block p-2 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] text-white/80 italic max-w-sm">
                  "{featured.greeting}"
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
                  <button
                    onClick={() => handleStartCall(featured)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-95 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/25 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 fill-white" />
                    <span>Talk to {featured.name.split(' ')[0]} (Voice)</span>
                  </button>
                  <button
                    onClick={() => handleStartChat(featured)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="flex items-center justify-between pt-1">
          <h3 className="text-xs font-bold text-tg-text-secondary uppercase tracking-wider">
            {activeCategory === 'all' ? 'All Voice Companions' : `${CATEGORIES.find(c => c.id === activeCategory)?.label}`}
          </h3>
          <span className="text-xs text-tg-text-hint font-medium">
            {characterList.length} Available
          </span>
        </div>

        {/* Character Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {characterList.map((character) => {
            return (
              <div
                key={character.id}
                className="group relative rounded-2xl p-4 bg-tg-bg-secondary border border-tg-border/30 hover:border-tg-blue/40 transition-all flex flex-col justify-between gap-3 shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  {/* Character Avatar */}
                  <div
                    className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-md flex items-center justify-center text-sm font-bold border border-tg-border/20 group-hover:scale-105 transition-transform"
                    style={{
                      background: `linear-gradient(135deg, ${character.gradient.from}, ${character.gradient.to})`,
                    }}
                  >
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
                      character.gradient.initial
                    )}
                    <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-tg-bg-secondary" />
                  </div>

                  {/* Character Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-bold text-tg-text truncate group-hover:text-tg-blue transition-colors">
                        {character.name}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-tg-surface text-tg-text-hint shrink-0">
                        {character.voice}
                      </span>
                    </div>

                    <p className="text-[11px] text-tg-text-secondary truncate mt-0.5">
                      {character.tagline}
                    </p>

                    {/* Tags */}
                    {character.tags && character.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {character.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded-md bg-tg-surface border border-tg-border/30 text-[9px] text-tg-text-hint font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Speech Quote Preview */}
                <p className="text-[11px] text-tg-text-hint italic line-clamp-2 px-2.5 py-1.5 rounded-xl bg-tg-surface/70 border border-tg-border/20">
                  "{character.greeting}"
                </p>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleStartCall(character)}
                    className="flex-1 py-2 px-3 rounded-xl bg-tg-blue/10 hover:bg-tg-blue active:scale-95 text-tg-blue hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-tg-blue/20"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Talk (Voice Call)</span>
                  </button>
                  <button
                    onClick={() => handleStartChat(character)}
                    className="py-2 px-3 rounded-xl bg-tg-surface hover:bg-tg-border/40 active:scale-95 text-tg-text-secondary text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    title="Send text message"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {characterList.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-tg-text text-sm font-semibold">No characters found</p>
            <p className="text-tg-text-hint text-xs">Try searching with a different keyword</p>
          </div>
        )}
      </div>
    </div>
  );
}
