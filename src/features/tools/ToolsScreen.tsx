'use client';
import { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ToolAppItem {
  id: string;
  name: string;
  khmerName: string;
  iconSrc: string;
  hoverBorder: string;
  hoverColor: string;
  route: string;
}

const APPS: ToolAppItem[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    khmerName: 'យូធូប',
    iconSrc: '/icons/youtube.svg',
    hoverBorder: 'group-hover:border-red-500/50',
    hoverColor: 'group-hover:text-red-500',
    route: '/youtube',
  },
  {
    id: 'dailymotion',
    name: 'Dailymotion',
    khmerName: 'ដេលីម៉ូសិន',
    iconSrc: '/icons/dailymotion.svg',
    hoverBorder: 'group-hover:border-[#0066dc]/50',
    hoverColor: 'group-hover:text-[#0066dc]',
    route: '/dailymotion',
  },
];

export default function ToolsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return APPS;
    const q = searchQuery.toLowerCase();
    return APPS.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.khmerName.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none">
      {/* ── Top Header (Exact Match to AI Screen Top Bar) ── */}
      <div className="px-4 pt-3 pb-2.5 safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-xl z-20">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0 border border-tg-border/20 flex items-center justify-center bg-tg-surface p-1 shadow-sm">
              <img
                src="/icons/tool-gear.png"
                alt="Tools Hub"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-tg-text text-[19px] font-bold tracking-tight leading-tight">
                  Tools
                </h1>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-tg-blue/15 text-tg-blue">
                  Hub
                </span>
              </div>
              <p className="text-[11px] text-tg-text-hint font-medium">
                Telegram Tools, Mini Apps & Services
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/40 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-all shadow-xs"
            aria-label="Settings"
            title="Configure Tools"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* ── Search Bar ── */}
        <div className="relative">
          <Search className="w-4 h-4 text-tg-text-hint absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools & apps..."
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
      </div>

      {/* ── App Launcher Grid ── */}
      <div className="p-4 max-w-xl mx-auto w-full">
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {filteredApps.map((app) => (
            <button
              key={app.id}
              onClick={() => router.push(app.route)}
              className="flex flex-col items-center text-center group active:scale-95 transition-transform focus:outline-none"
            >
              <div
                className={`relative w-16 h-16 rounded-[22px] p-2.5 shadow-sm border border-tg-border/30 bg-tg-surface ${app.hoverBorder} transition-all flex items-center justify-center overflow-hidden`}
              >
                <img
                  src={app.iconSrc}
                  alt={app.name}
                  className="w-full h-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
                />
              </div>

              <span
                className={`text-xs font-semibold text-tg-text mt-1.5 ${app.hoverColor} transition-colors`}
              >
                {app.name}
              </span>
              <span className="text-[10px] text-tg-text-hint font-medium">
                {app.khmerName}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
