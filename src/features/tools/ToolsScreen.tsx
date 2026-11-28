'use client';
import { Wrench, SlidersHorizontal } from 'lucide-react';
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
                  Tools
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

      {/* ── App Launcher Grid ── */}
      <div className="p-4 max-w-xl mx-auto w-full">
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {/* YouTube App Icon */}
          <button
            onClick={() => router.push('/youtube')}
            className="flex flex-col items-center text-center group active:scale-95 transition-transform focus:outline-none"
          >
            <div className="relative w-16 h-16 rounded-[22px] p-2.5 shadow-sm border border-tg-border/30 bg-tg-surface group-hover:border-red-500/50 transition-all flex items-center justify-center overflow-hidden">
              <img
                src="/icons/youtube.svg"
                alt="YouTube"
                className="w-full h-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
              />
            </div>

            <span className="text-xs font-semibold text-tg-text mt-1.5 group-hover:text-red-500 transition-colors">
              YouTube
            </span>
            <span className="text-[10px] text-tg-text-hint font-medium">
              យូធូប
            </span>
          </button>

          {/* Dailymotion App Icon */}
          <button
            onClick={() => router.push('/dailymotion')}
            className="flex flex-col items-center text-center group active:scale-95 transition-transform focus:outline-none"
          >
            <div className="relative w-16 h-16 rounded-[22px] p-2.5 shadow-sm border border-tg-border/30 bg-tg-surface group-hover:border-[#0066dc]/50 transition-all flex items-center justify-center overflow-hidden">
              <img
                src="/icons/dailymotion.svg"
                alt="Dailymotion"
                className="w-full h-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
              />
            </div>

            <span className="text-xs font-semibold text-tg-text mt-1.5 group-hover:text-[#0066dc] transition-colors">
              Dailymotion
            </span>
            <span className="text-[10px] text-tg-text-hint font-medium">
              ដេលីម៉ូសិន
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
