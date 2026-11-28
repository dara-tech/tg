'use client';
import {
  Wrench,
  SlidersHorizontal,
  Play,
  Flame,
  Tv,
  Sparkles,
  ChevronRight,
  Headphones,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ToolsScreen() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none">
      {/* ── Top Header ── */}
      <div className="px-4 pt-3 pb-2.5 safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-xl z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl shrink-0 border border-tg-border/20 flex items-center justify-center bg-tg-surface shadow-xs text-tg-blue">
              <Wrench className="w-5 h-5 text-tg-blue" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-tg-text text-[19px] font-bold tracking-tight">
                  Tools & Apps
                </h1>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-tg-blue/15 text-tg-blue">
                  Hub
                </span>
              </div>
              <p className="text-[11px] text-tg-text-hint font-medium">
                ឧបករណ៍ និងកម្មវិធីជំនួយ
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/40 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-all shadow-xs"
            aria-label="Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
        {/* ── Featured Spotlight Card (Polished & Consistent) ── */}
        <div
          onClick={() => router.push('/youtube')}
          className="p-4 rounded-3xl bg-gradient-to-br from-rose-500/12 via-red-500/8 to-amber-500/8 border border-rose-500/25 relative overflow-hidden shadow-xs cursor-pointer active:scale-[0.99] transition-all group"
        >
          {/* Header row: Icon, Name, Category & Open button */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-white p-2.5 shrink-0 shadow-sm border border-black/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                <img
                  src="/icons/youtube.svg"
                  alt="YouTube"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-tg-text group-hover:text-red-500 transition-colors">
                    YouTube
                  </h3>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20 shrink-0" />
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-red-500 text-white">
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-tg-text-secondary truncate mt-0.5 font-medium">
                  Video Streaming & Creator Channels
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push('/youtube');
              }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all shrink-0"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Open</span>
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-tg-text-secondary mt-3 relative z-10 line-clamp-2 leading-relaxed">
            ទស្សនាវីដេអូគ្មានពាណិជ្ជកម្ម គាំទ្រការចាក់អណ្តែតលើអេក្រង់ (PiP) និងចាក់សម្លេងនៅ Background ពេលប្តូរកម្មវិធី។
          </p>

          {/* Feature Badge Pills */}
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-rose-500/15 relative z-10 overflow-x-auto scrollbar-hide">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-tg-surface/80 border border-tg-border/30 text-tg-text-secondary flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Ad-Free</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-tg-surface/80 border border-tg-border/30 text-tg-text-secondary flex items-center gap-1">
              <Tv className="w-3 h-3 text-red-500" />
              <span>Floating PiP</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-tg-surface/80 border border-tg-border/30 text-tg-text-secondary flex items-center gap-1">
              <Headphones className="w-3 h-3 text-blue-500" />
              <span>Background Audio</span>
            </span>
          </div>

          {/* Decorative Background Watermark */}
          <div className="absolute right-[-10px] -bottom-4 w-32 h-32 opacity-[0.07] pointer-events-none text-red-600">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
        </div>

        {/* ── Section: Quick Access ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold text-tg-text tracking-wider uppercase text-tg-text-secondary">
              Quick Shortcuts
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Shortcut 1: Trending Feed */}
            <div
              onClick={() => router.push('/youtube')}
              className="p-3.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 hover:border-red-500/40 cursor-pointer active:scale-[0.98] transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 p-1 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Flame className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-tg-text group-hover:text-red-500 transition-colors truncate">
                  Trending Feed
                </h5>
                <p className="text-[10px] text-tg-text-hint truncate">
                  វីដេអូពេញនិយម
                </p>
              </div>
            </div>

            {/* Shortcut 2: Channels */}
            <div
              onClick={() => router.push('/youtube')}
              className="p-3.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 hover:border-red-500/40 cursor-pointer active:scale-[0.98] transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-1 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Tv className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-tg-text group-hover:text-red-500 transition-colors truncate">
                  Top Channels
                </h5>
                <p className="text-[10px] text-tg-text-hint truncate">
                  ឆានែលផ្លូវការ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Direct Launch Banner ── */}
        <div
          onClick={() => router.push('/youtube')}
          className="p-3.5 rounded-2xl bg-tg-bg-secondary border border-tg-border/25 hover:border-red-500/30 cursor-pointer active:scale-[0.99] transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs border border-black/5">
              <img
                src="/icons/youtube.svg"
                alt="YouTube"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h5 className="text-xs font-bold text-tg-text group-hover:text-red-500 transition-colors truncate">
                Explore Full YouTube Feed
              </h5>
              <p className="text-[11px] text-tg-text-hint truncate">
                ស្វែងរក និងទស្សនាវីដេអូគ្រប់ប្រភេទ
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-tg-text-hint group-hover:text-tg-text group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </div>
    </div>
  );
}
