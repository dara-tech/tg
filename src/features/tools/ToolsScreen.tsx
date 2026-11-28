'use client';
import { useState } from 'react';
import {
  Wrench,
  Sparkles,
  QrCode,
  Search,
  Calendar,
  Landmark,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Bot,
  Layers,
  Cloud,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ToolItem {
  id: string;
  name: string;
  khmerName: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  color: string;
  gradient: string;
  href?: string;
  available: boolean;
}

export default function ToolsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'ready' | 'upcoming'>('all');

  const tools: ToolItem[] = [
    {
      id: 'ai',
      name: 'AI Live Companions',
      khmerName: 'ជំនួយការ AI',
      description: 'Voice chat and intelligent assistants powered by Gemini Live.',
      icon: Cpu,
      badge: 'Live',
      color: 'text-sky-400',
      gradient: 'from-sky-500/20 via-indigo-500/15 to-transparent',
      href: '/ai',
      available: true,
    },
    {
      id: 'erp',
      name: 'Bank & ERP Hub',
      khmerName: 'ធនាគារ និង ERP',
      description: 'Transactions, invoicing and financial records sync.',
      icon: Landmark,
      badge: 'Ready',
      color: 'text-emerald-400',
      gradient: 'from-emerald-500/20 via-teal-500/15 to-transparent',
      href: '/erp',
      available: true,
    },
    {
      id: 'calendar',
      name: 'Calendar & GitHub Sync',
      khmerName: 'ប្រតិទិនការងារ',
      description: 'Milestones, issues, releases and daily agenda tracking.',
      icon: Calendar,
      badge: 'Ready',
      color: 'text-amber-400',
      gradient: 'from-amber-500/20 via-orange-500/15 to-transparent',
      href: '/calendar',
      available: true,
    },
    {
      id: 'qr',
      name: 'QR Code Scanner',
      khmerName: 'ស្កេន QR',
      description: 'Scan links, logins, and quick contact transfer codes.',
      icon: QrCode,
      badge: 'Ready',
      color: 'text-purple-400',
      gradient: 'from-purple-500/20 via-pink-500/15 to-transparent',
      href: '/qr-scan',
      available: true,
    },
    {
      id: 'search',
      name: 'Universal Search',
      khmerName: 'ស្វែងរកទូទៅ',
      description: 'Fast full-text lookup across chats, media, files and links.',
      icon: Search,
      color: 'text-blue-400',
      gradient: 'from-blue-500/20 via-cyan-500/15 to-transparent',
      href: '/search',
      available: true,
    },
    {
      id: 'miniapp',
      name: 'Telegram Mini Apps',
      khmerName: 'កម្មវិធី Mini Apps',
      description: 'Launch Telegram web apps and web3 integrations directly.',
      icon: Layers,
      badge: 'Soon',
      color: 'text-pink-400',
      gradient: 'from-pink-500/20 via-rose-500/15 to-transparent',
      available: false,
    },
    {
      id: 'bots',
      name: 'Bot Automation Hub',
      khmerName: 'ប្រព័ន្ធ Bot ស្វ័យប្រវត្តិ',
      description: 'Scheduled tasks, webhook triggers and bot orchestrator.',
      icon: Bot,
      badge: 'Soon',
      color: 'text-cyan-400',
      gradient: 'from-cyan-500/20 via-blue-500/15 to-transparent',
      available: false,
    },
    {
      id: 'storage',
      name: 'Cloud Data & Drive',
      khmerName: 'ផ្ទុកទិន្នន័យលើពពក',
      description: 'Export Telegram files, photos and saved media to Cloud storage.',
      icon: Cloud,
      badge: 'Soon',
      color: 'text-indigo-400',
      gradient: 'from-indigo-500/20 via-purple-500/15 to-transparent',
      available: false,
    },
    {
      id: 'security',
      name: 'Security & Session Monitor',
      khmerName: 'សុវត្ថិភាពគណនី',
      description: 'Manage active MTProto sessions, 2FA keys, and device access.',
      icon: ShieldCheck,
      badge: 'Soon',
      color: 'text-emerald-400',
      gradient: 'from-emerald-500/20 via-cyan-500/15 to-transparent',
      available: false,
    },
  ];

  const filteredTools = tools.filter((t) => {
    if (filter === 'ready') return t.available;
    if (filter === 'upcoming') return !t.available;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-24 select-none">
      {/* ── Top Header ── */}
      <div className="px-4 pt-3 pb-3 safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/90 backdrop-blur-xl z-20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl overflow-hidden shrink-0 border border-tg-border/20 flex items-center justify-center bg-tg-surface p-1 shadow-sm text-tg-blue">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-tg-text text-[20px] font-bold tracking-tight leading-tight">
                Tools & Apps
              </h1>
              <p className="text-[11px] text-tg-text-hint font-medium">
                ឧបករណ៍ និងកម្មវិធីជំនួយ
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/40 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-all shadow-sm"
            aria-label="Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-2">
          {(
            [
              { id: 'all', label: 'ទាំងអស់' },
              { id: 'ready', label: 'ដំណើរការ' },
              { id: 'upcoming', label: 'នឹងមកដល់' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filter === item.id
                  ? 'bg-tg-blue text-white shadow-sm'
                  : 'bg-tg-surface text-tg-text-secondary border border-tg-border/30 hover:text-tg-text'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tools Grid / List ── */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 gap-2.5">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => {
                  if (tool.available && tool.href) {
                    router.push(tool.href);
                  }
                }}
                className={`group relative p-3.5 rounded-2xl border transition-all ${
                  tool.available
                    ? 'bg-tg-bg-secondary border-tg-border/30 active:scale-[0.99] cursor-pointer hover:border-tg-blue/40'
                    : 'bg-tg-bg-secondary/60 border-tg-border/15 opacity-80 cursor-default'
                }`}
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${tool.gradient} pointer-events-none opacity-40`} />

                <div className="relative flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-tg-surface/90 border border-tg-border/30 flex items-center justify-center shrink-0 ${tool.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-tg-text truncate">
                        {tool.name}
                      </span>
                      {tool.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            tool.badge === 'Live'
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : tool.badge === 'Ready'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-tg-surface text-tg-text-hint border border-tg-border/30'
                          }`}
                        >
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-tg-text-hint line-clamp-1">
                      {tool.description}
                    </p>
                  </div>

                  {tool.available && (
                    <ArrowRight className="w-4 h-4 text-tg-text-hint group-hover:text-tg-blue group-hover:translate-x-0.5 transition-all shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Coming soon banner */}
        <div className="mt-4 p-4 rounded-2xl border border-dashed border-tg-border/40 text-center bg-tg-surface/30">
          <Wrench className="w-6 h-6 mx-auto mb-1.5 text-tg-text-hint/60" />
          <p className="text-xs font-semibold text-tg-text">កម្មវិធី និងឧបករណ៍បន្ថែម</p>
          <p className="text-[11px] text-tg-text-hint mt-0.5">
            Tool Apps ថ្មីៗជាច្រើនទៀតនឹងត្រូវដាក់បញ្ចូលបន្តិចម្តងៗនៅទីនេះ។
          </p>
        </div>
      </div>
    </div>
  );
}
