'use client';
import { useState, useMemo } from 'react';
import {
  Bot,
  Phone,
  MessageSquare,
  Search,
  Volume2,
  Mic,
  SlidersHorizontal,
  Flame,
  Radio,
  Check,
  UserCheck,
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { AI_PERSONAS } from '@/services/aiCall/personas';
import type { AIPersona, PersonaConfig } from '@/services/aiCall/types';
import { toast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

// Clean Anime Bento Themes (matching Calendar screen pastel and dark mode tokens)
const BENTO_THEMES: Record<
  string,
  { bg: string; pill: string; sub: string; btn: string; border: string; accentText: string }
> = {
  bopha: {
    bg: 'bg-[#F5D5DD] dark:bg-[#43232C] text-[#331119] dark:text-[#FDE8EE]',
    pill: 'bg-black/10 dark:bg-white/15 text-[#331119] dark:text-[#FDE8EE]',
    sub: 'text-[#331119]/75 dark:text-[#FDE8EE]/80',
    btn: 'bg-[#331119] text-white dark:bg-[#FDE8EE] dark:text-[#331119]',
    border: 'border-[#E8B4C0]/40 dark:border-[#5E323E]/50',
    accentText: 'text-[#C93B62] dark:text-[#FCA5B9]',
  },
  lily: {
    bg: 'bg-[#FDE2B8] dark:bg-[#523512] text-[#361E05] dark:text-[#FEEDD2]',
    pill: 'bg-black/10 dark:bg-white/15 text-[#361E05] dark:text-[#FEEDD2]',
    sub: 'text-[#361E05]/75 dark:text-[#FEEDD2]/80',
    btn: 'bg-[#361E05] text-white dark:bg-[#FEEDD2] dark:text-[#361E05]',
    border: 'border-[#F2C37D]/40 dark:border-[#734B19]/50',
    accentText: 'text-[#D97706] dark:text-[#FCD34D]',
  },
  dara: {
    bg: 'bg-[#CBE4D6] dark:bg-[#1E3B2C] text-[#0C291B] dark:text-[#E2F2E9]',
    pill: 'bg-black/10 dark:bg-white/15 text-[#0C291B] dark:text-[#E2F2E9]',
    sub: 'text-[#0C291B]/75 dark:text-[#E2F2E9]/80',
    btn: 'bg-[#0C291B] text-white dark:bg-[#E2F2E9] dark:text-[#0C291B]',
    border: 'border-[#A3D1B4]/40 dark:border-[#2C523E]/50',
    accentText: 'text-[#059669] dark:text-[#6EE7B7]',
  },
  developer: {
    bg: 'bg-[#C8DBEC] dark:bg-[#193247] text-[#0A2236] dark:text-[#E0EEFA]',
    pill: 'bg-black/10 dark:bg-white/15 text-[#0A2236] dark:text-[#E0EEFA]',
    sub: 'text-[#0A2236]/75 dark:text-[#E0EEFA]/80',
    btn: 'bg-[#0A2236] text-white dark:bg-[#E0EEFA] dark:text-[#0A2236]',
    border: 'border-[#9EBFDE]/40 dark:border-[#274864]/50',
    accentText: 'text-[#2563EB] dark:text-[#93C5FD]',
  },
  telegram: {
    bg: 'bg-[#D2E7F7] dark:bg-[#163650] text-[#082238] dark:text-[#E5F2FC]',
    pill: 'bg-black/10 dark:bg-white/15 text-[#082238] dark:text-[#E5F2FC]',
    sub: 'text-[#082238]/75 dark:text-[#E5F2FC]/80',
    btn: 'bg-[#082238] text-white dark:bg-[#E5F2FC] dark:text-[#082238]',
    border: 'border-[#A3CCEB]/40 dark:border-[#234D70]/50',
    accentText: 'text-[#0284C7] dark:text-[#7DD3FC]',
  },
  madai: {
    bg: 'bg-[#E5D7F2] dark:bg-[#3D2554] text-[#240F36] dark:text-[#F3ECFB]',
    pill: 'bg-black/10 dark:bg-white/15 text-[#240F36] dark:text-[#F3ECFB]',
    sub: 'text-[#240F36]/75 dark:text-[#F3ECFB]/80',
    btn: 'bg-[#240F36] text-white dark:bg-[#F3ECFB] dark:text-[#240F36]',
    border: 'border-[#C8AEDF]/40 dark:border-[#573577]/50',
    accentText: 'text-[#9333EA] dark:text-[#D8B4FE]',
  },
  terminator: {
    bg: 'bg-[#DCDFE4] dark:bg-[#282B30] text-[#191B1F] dark:text-[#EAECEF]',
    pill: 'bg-black/10 dark:bg-white/15 text-[#191B1F] dark:text-[#EAECEF]',
    sub: 'text-[#191B1F]/75 dark:text-[#EAECEF]/80',
    btn: 'bg-[#191B1F] text-white dark:bg-[#EAECEF] dark:text-[#191B1F]',
    border: 'border-[#B8BDC7]/40 dark:border-[#3D414A]/50',
    accentText: 'text-[#4B5563] dark:text-[#9CA3AF]',
  },
  fifa2026: {
    bg: 'bg-[#D3E8D0] dark:bg-[#1E3B21] text-[#0C2A11] dark:text-[#E6F5E4]',
    pill: 'bg-black/10 dark:bg-white/15 text-[#0C2A11] dark:text-[#E6F5E4]',
    sub: 'text-[#0C2A11]/75 dark:text-[#E6F5E4]/80',
    btn: 'bg-[#0C2A11] text-white dark:bg-[#E6F5E4] dark:text-[#0C2A11]',
    border: 'border-[#A9D4A4]/40 dark:border-[#2C5231]/50',
    accentText: 'text-[#16A34A] dark:text-[#86EFAC]',
  },
  financemaster: {
    bg: 'bg-[#F2ECD1] dark:bg-[#47401C] text-[#302A09] dark:text-[#FBF7E4]',
    pill: 'bg-black/10 dark:bg-white/15 text-[#302A09] dark:text-[#FBF7E4]',
    sub: 'text-[#302A09]/75 dark:text-[#FBF7E4]/80',
    btn: 'bg-[#302A09] text-white dark:bg-[#FBF7E4] dark:text-[#302A09]',
    border: 'border-[#DDD09E]/40 dark:border-[#635928]/50',
    accentText: 'text-[#CA8A04] dark:text-[#FDE047]',
  },
  genz: {
    bg: 'bg-[#F5D8EB] dark:bg-[#48203B] text-[#330D26] dark:text-[#FBEBF4]',
    pill: 'bg-black/10 dark:bg-white/15 text-[#330D26] dark:text-[#FBEBF4]',
    sub: 'text-[#330D26]/75 dark:text-[#FBEBF4]/80',
    btn: 'bg-[#330D26] text-white dark:bg-[#FBEBF4] dark:text-[#330D26]',
    border: 'border-[#E2ACCB]/40 dark:border-[#673055]/50',
    accentText: 'text-[#C026D3] dark:text-[#F0ABFC]',
  },
};

const DEFAULT_BENTO_THEME = BENTO_THEMES.bopha;

const CATEGORIES = [
  { id: 'all', label: 'All Characters' },
  { id: 'khmer', label: 'Khmer (ខ្មែរ)' },
  { id: 'tech', label: 'Tech & Code' },
  { id: 'anime', label: 'Anime & Cool' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'advisor', label: 'Advisors' },
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
        p.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const featured = AI_PERSONAS.bopha || Object.values(AI_PERSONAS)[0];
  const featuredTheme = BENTO_THEMES[featured.id] || DEFAULT_BENTO_THEME;

  const handleStartCall = (persona: PersonaConfig) => {
    setAiPersona(persona.id);
    startAiCall(persona.id);
    toast(`Calling ${persona.name}...`, 'info');
  };

  const handleStartChat = (persona: PersonaConfig) => {
    setAiPersona(persona.id);
    toast(`Selected ${persona.name}`, 'info');
    router.push('/dialogs');
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(120, 120, 120, 0.14) 1px, transparent 0)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* ── Top Header (Consistent with Calendar View) ── */}
      <div className="px-4 pt-3 pb-3 safe-top border-b border-tg-border/20 [data-theme='manga']_&:border-b-0 sticky top-0 bg-tg-bg/85 backdrop-blur-xl z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl overflow-hidden shadow-md shrink-0 border border-tg-border/20 flex items-center justify-center bg-white/10 p-0.5">
              <img src="/icons/ai-brain.png" alt="AI" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-tg-text text-[22px] font-black tracking-tight leading-none">
                AI Characters
              </h1>
              <p className="text-[11px] text-tg-text-hint font-medium mt-0.5">
                Real-time voice & companion chat
              </p>
            </div>
          </div>

          {/* Quick Settings Shortcut */}
          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/40 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-all shadow-sm"
            aria-label="Settings"
            title="Configure AI voice & keys"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Minimalist Search Input */}
        <div className="relative mb-2.5">
          <Search className="w-4 h-4 text-tg-text-hint absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anime companions, voice, topics..."
            className="w-full bg-tg-surface/90 border border-tg-border/30 rounded-2xl pl-9.5 pr-4 py-2 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue transition-all backdrop-blur-sm"
          />
        </div>

        {/* Segmented Filter Pills (Consistent with Calendar Today / Calendar toggles) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'bg-tg-surface/80 text-tg-text-secondary hover:text-tg-text border border-tg-border/20 active:scale-95'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Bento Grid Area ── */}
      <div className="p-4 space-y-4 max-w-4xl mx-auto w-full">
        {/* ── Hero Bento Spotlight ── */}
        {activeCategory === 'all' && searchQuery === '' && (
          <div
            className={`rounded-3xl p-5 sm:p-6 ${featuredTheme.bg} border ${featuredTheme.border} shadow-lg transition-all relative overflow-hidden`}
          >
            {/* Background Decorative Circles */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/20 dark:bg-white/5 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Anime Avatar Bento Tile */}
              <div className="relative shrink-0 flex items-center justify-center">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-white/40 dark:border-white/10 shadow-xl bg-white/30 dark:bg-black/20 p-1">
                  <img
                    src={featured.avatar}
                    alt={featured.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                </div>
                {/* Live Audio Waves Badge */}
                <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold shadow-md flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>Live Call</span>
                </div>
              </div>

              {/* Character Details & Talk Actions */}
              <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${featuredTheme.pill}`}>
                    Featured Companion
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${featuredTheme.pill} flex items-center gap-1`}>
                    <Volume2 className="w-3 h-3" /> Voice: {featured.voice}
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                    {featured.name}
                  </h2>
                  <p className={`text-xs font-medium ${featuredTheme.sub} mt-0.5 line-clamp-2`}>
                    {featured.description || featured.tagline}
                  </p>
                </div>

                {/* Speech Bubble Quote */}
                <div className={`p-2.5 rounded-2xl ${featuredTheme.pill} text-[11px] font-medium italic border border-black/5 dark:border-white/10 max-w-md`}>
                  "{featured.greeting}"
                </div>

                {/* Big Action Buttons */}
                <div className="pt-2 flex items-center justify-center sm:justify-start gap-2.5">
                  <button
                    onClick={() => handleStartCall(featured)}
                    className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all ${featuredTheme.btn}`}
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                    <span>Talk with {featured.name.split(' ')[0]}</span>
                  </button>
                  <button
                    onClick={() => handleStartChat(featured)}
                    className={`px-4 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 ${featuredTheme.pill} hover:opacity-80 active:scale-95 transition-all`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Section Label ── */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tg-blue" />
            <h3 className="text-xs font-black uppercase tracking-wider text-tg-text">
              {activeCategory === 'all'
                ? 'All Companions'
                : CATEGORIES.find((c) => c.id === activeCategory)?.label}
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-tg-text-hint">
            {characterList.length} Characters
          </span>
        </div>

        {/* ── Bento Grid Cards (Consistent with Calendar Timeline Bento) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {characterList.map((character) => {
            const theme = BENTO_THEMES[character.id] || DEFAULT_BENTO_THEME;
            const isCurrentSelected = aiPersona === character.id;

            return (
              <div
                key={character.id}
                className={`rounded-3xl p-4.5 sm:p-5 ${theme.bg} border ${theme.border} shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden group`}
              >
                {/* Header Row */}
                <div className="flex items-start gap-3.5">
                  {/* Avatar Frame */}
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-md border border-black/10 dark:border-white/10 p-0.5 bg-white/40 dark:bg-black/30 group-hover:scale-105 transition-transform">
                    {character.avatar ? (
                      <img
                        src={character.avatar}
                        alt={character.name}
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl flex items-center justify-center font-bold text-base">
                        {character.gradient.initial}
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-black" />
                  </div>

                  {/* Character Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-base font-black tracking-tight truncate leading-tight">
                        {character.name}
                      </h4>
                      {isCurrentSelected && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${theme.pill} flex items-center gap-0.5 shrink-0`}>
                          <Check className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                    </div>

                    <p className={`text-[11px] font-medium ${theme.sub} truncate mt-0.5`}>
                      {character.tagline}
                    </p>

                    {/* Bento Tags */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${theme.pill}`}>
                        Voice: {character.voice}
                      </span>
                      {character.tags?.slice(0, 2).map((t, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${theme.pill}`}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Greeting Bubble Preview */}
                <div className={`p-2.5 rounded-2xl ${theme.pill} text-[11px] font-medium italic border border-black/5 dark:border-white/10 line-clamp-2`}>
                  "{character.greeting}"
                </div>

                {/* Bento Footer Action Buttons */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={() => handleStartCall(character)}
                    className={`flex-1 py-2.5 px-3.5 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all ${theme.btn}`}
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                    <span>Talk with {character.name.split(' ')[0]}</span>
                  </button>

                  <button
                    onClick={() => handleStartChat(character)}
                    className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center ${theme.pill} hover:opacity-80 active:scale-95 transition-all`}
                    title="Open chat"
                    aria-label={`Chat with ${character.name}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Empty State ── */}
        {characterList.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-tg-surface mx-auto flex items-center justify-center text-tg-text-hint">
              <Bot className="w-6 h-6" />
            </div>
            <p className="text-tg-text text-sm font-bold">No characters found</p>
            <p className="text-tg-text-hint text-xs">Try selecting another category or clear search</p>
          </div>
        )}
      </div>
    </div>
  );
}
