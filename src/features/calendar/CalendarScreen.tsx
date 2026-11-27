'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  CheckCircle2,
  Bell,
  Briefcase,
  User,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Check,
  Layers,
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { toast } from '@/components/ui/Toast';
import clsx from 'clsx';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  isToday,
} from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: 'personal' | 'work' | 'reminder' | 'urgent' | 'github' | 'erp';
  completed?: boolean;
  source?: 'local' | 'github' | 'erp';
  sourceUrl?: string;
  sourceMeta?: {
    repo?: string;
    number?: number;
    type?: 'milestone' | 'issue' | 'pr' | 'release' | 'erp';
  };
}

export interface SyncConfig {
  githubRepo: string; // e.g. "dara-tech/tg"
  githubToken: string; // optional personal access token
  erpApiUrl: string; // optional ERP endpoint
  erpToken: string;
  syncMilestones: boolean;
  syncIssues: boolean;
  syncReleases: boolean;
  lastSyncedAt?: number;
}

const STORAGE_KEY = 'tg_calendar_events_v2';
const SYNC_CONFIG_KEY = 'tg_calendar_sync_config_v2';

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  githubRepo: 'dara-tech/tg',
  githubToken: '',
  erpApiUrl: '',
  erpToken: '',
  syncMilestones: true,
  syncIssues: true,
  syncReleases: true,
};

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-1',
    title: 'Weekly ERP & Tech Sync',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '14:00',
    category: 'work',
    source: 'local',
  },
  {
    id: 'evt-2',
    title: 'Review Telegram Web V2 Deployment',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '17:30',
    category: 'github',
    source: 'github',
    sourceUrl: 'https://github.com/dara-tech/tg',
    sourceMeta: { repo: 'dara-tech/tg', type: 'pr' },
  },
  {
    id: 'evt-3',
    title: 'STI Database ERP Milestone',
    date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    time: '09:00',
    category: 'erp',
    source: 'erp',
    sourceMeta: { type: 'erp' },
  },
];

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

const CATEGORY_META = {
  personal: { label: 'Personal', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', icon: User },
  work:     { label: 'Work',     color: 'bg-sky-500/15 text-sky-500 border-sky-500/30',         icon: Briefcase },
  reminder: { label: 'Reminder', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30',     icon: Bell },
  urgent:   { label: 'Urgent',   color: 'bg-rose-500/15 text-rose-500 border-rose-500/30',       icon: AlertCircle },
  github:   { label: 'GitHub',   color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: GitBranch },
  erp:      { label: 'ERP Sync', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', icon: Layers },
};

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window === 'undefined') return INITIAL_EVENTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_EVENTS;
  });

  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_SYNC_CONFIG;
    try {
      const stored = localStorage.getItem(SYNC_CONFIG_KEY);
      if (stored) return { ...DEFAULT_SYNC_CONFIG, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_SYNC_CONFIG;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newCategory, setNewCategory] = useState<CalendarEvent['category']>('work');

  // Reload sync config whenever user returns from Profile Settings
  useEffect(() => {
    const reloadConfig = () => {
      try {
        const stored = localStorage.getItem(SYNC_CONFIG_KEY);
        if (stored) {
          setSyncConfig({ ...DEFAULT_SYNC_CONFIG, ...JSON.parse(stored) });
        }
      } catch {}
    };
    reloadConfig();
    window.addEventListener('focus', reloadConfig);
    return () => window.removeEventListener('focus', reloadConfig);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {}
  }, [events]);

  const selectedKey = format(selectedDate, 'yyyy-MM-dd');

  // Month grid calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [startDate, endDate]);

  const eventDatesMap = useMemo(() => {
    const map = new Map<string, Array<CalendarEvent['category']>>();
    events.forEach((e) => {
      const list = map.get(e.date) || [];
      if (!list.includes(e.category)) list.push(e.category);
      map.set(e.date, list);
    });
    return map;
  }, [events]);

  const selectedEvents = useMemo(() => {
    return events.filter((e) => e.date === selectedKey).sort((a, b) => a.time.localeCompare(b.time));
  }, [events, selectedKey]);

  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  /**
   * Syncs milestones, issues, and releases from GitHub & ERP
   */
  const handleSyncGithubAndErp = useCallback(async (customCfg?: SyncConfig) => {
    let cfg = customCfg || syncConfig;
    try {
      const stored = localStorage.getItem(SYNC_CONFIG_KEY);
      if (stored) {
        cfg = { ...DEFAULT_SYNC_CONFIG, ...JSON.parse(stored) };
        setSyncConfig(cfg);
      }
    } catch {}

    if (!cfg.githubRepo.trim() && !cfg.erpApiUrl.trim()) {
      toast('Configure GitHub & ERP in Profile Settings', 'error');
      return;
    }

    setIsSyncing(true);
    const newSyncedEvents: CalendarEvent[] = [];

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (cfg.githubToken.trim()) {
      headers.Authorization = `token ${cfg.githubToken.trim()}`;
    }

    try {
      // 1. Fetch GitHub Milestones
      if (cfg.githubRepo && cfg.syncMilestones) {
        try {
          const res = await fetch(`https://api.github.com/repos/${cfg.githubRepo.trim()}/milestones?state=all&per_page=30`, {
            headers,
          });
          if (res.ok) {
            const milestones = await res.json();
            if (Array.isArray(milestones)) {
              milestones.forEach((m: { id: number; title: string; due_on?: string; html_url?: string; state?: string }) => {
                const targetDate = m.due_on ? format(new Date(m.due_on), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
                newSyncedEvents.push({
                  id: `gh-m-${m.id}`,
                  title: `[Milestone] ${m.title}`,
                  date: targetDate,
                  time: '10:00',
                  category: 'github',
                  source: 'github',
                  sourceUrl: m.html_url,
                  completed: m.state === 'closed',
                  sourceMeta: { repo: cfg.githubRepo, type: 'milestone' },
                });
              });
            }
          }
        } catch (err) {
          console.warn('[Calendar] GitHub Milestones sync failed:', err);
        }
      }

      // 2. Fetch GitHub Issues / PRs
      if (cfg.githubRepo && cfg.syncIssues) {
        try {
          const res = await fetch(`https://api.github.com/repos/${cfg.githubRepo.trim()}/issues?state=all&per_page=30`, {
            headers,
          });
          if (res.ok) {
            const issues = await res.json();
            if (Array.isArray(issues)) {
              issues.forEach((iss: {
                id: number;
                number: number;
                title: string;
                html_url: string;
                created_at: string;
                closed_at?: string;
                milestone?: { due_on?: string };
                pull_request?: unknown;
                state?: string;
              }) => {
                const isPr = Boolean(iss.pull_request);
                const rawDate = iss.milestone?.due_on || iss.created_at;
                const targetDate = format(new Date(rawDate), 'yyyy-MM-dd');
                newSyncedEvents.push({
                  id: `gh-i-${iss.id}`,
                  title: `${isPr ? '[PR #' : '[Issue #'}${iss.number}] ${iss.title}`,
                  date: targetDate,
                  time: '15:00',
                  category: 'github',
                  source: 'github',
                  sourceUrl: iss.html_url,
                  completed: iss.state === 'closed',
                  sourceMeta: { repo: cfg.githubRepo, number: iss.number, type: isPr ? 'pr' : 'issue' },
                });
              });
            }
          }
        } catch (err) {
          console.warn('[Calendar] GitHub Issues sync failed:', err);
        }
      }

      // 3. Fetch GitHub Releases
      if (cfg.githubRepo && cfg.syncReleases) {
        try {
          const res = await fetch(`https://api.github.com/repos/${cfg.githubRepo.trim()}/releases?per_page=15`, {
            headers,
          });
          if (res.ok) {
            const releases = await res.json();
            if (Array.isArray(releases)) {
              releases.forEach((rel: { id: number; name?: string; tag_name: string; published_at: string; html_url: string }) => {
                const targetDate = format(new Date(rel.published_at), 'yyyy-MM-dd');
                newSyncedEvents.push({
                  id: `gh-r-${rel.id}`,
                  title: `[Release] ${rel.name || rel.tag_name}`,
                  date: targetDate,
                  time: '12:00',
                  category: 'github',
                  source: 'github',
                  sourceUrl: rel.html_url,
                  completed: true,
                  sourceMeta: { repo: cfg.githubRepo, type: 'release' },
                });
              });
            }
          }
        } catch (err) {
          console.warn('[Calendar] GitHub Releases sync failed:', err);
        }
      }

      // 4. Fetch Custom ERP System Feed (if configured)
      if (cfg.erpApiUrl.trim()) {
        try {
          const erpHeaders: Record<string, string> = {};
          if (cfg.erpToken.trim()) erpHeaders.Authorization = `Bearer ${cfg.erpToken.trim()}`;
          const res = await fetch(cfg.erpApiUrl.trim(), { headers: erpHeaders });
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : data.events || data.items || [];
            list.forEach((item: { id?: string | number; title: string; date: string; time?: string; url?: string; completed?: boolean }) => {
              newSyncedEvents.push({
                id: `erp-${item.id || Math.random()}`,
                title: `[ERP] ${item.title}`,
                date: item.date,
                time: item.time || '09:00',
                category: 'erp',
                source: 'erp',
                sourceUrl: item.url,
                completed: item.completed ?? false,
                sourceMeta: { type: 'erp' },
              });
            });
          }
        } catch (err) {
          console.warn('[Calendar] ERP feed sync failed:', err);
        }
      }

      // Merge synced items into events (replacing older synced items, preserving local user events)
      setEvents((prev) => {
        const localOnly = prev.filter((e) => e.source === 'local' || (!e.source && !e.id.startsWith('gh-') && !e.id.startsWith('erp-')));
        return [...localOnly, ...newSyncedEvents];
      });

      setSyncConfig((prev) => ({ ...prev, lastSyncedAt: Date.now() }));
      toast(`Synced ${newSyncedEvents.length} items from GitHub & ERP`, 'success');
    } catch {
      toast('Failed to sync GitHub / ERP calendar', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [syncConfig]);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast('Please enter an event title', 'error');
      return;
    }
    const newEvent: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newTitle.trim(),
      date: selectedKey,
      time: newTime || '09:00',
      category: newCategory,
      source: 'local',
    };
    setEvents((prev) => [...prev, newEvent]);
    setNewTitle('');
    setAddSheetOpen(false);
    toast('Event added to calendar', 'success');
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast('Event removed');
  };

  const handleToggleComplete = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e))
    );
  };

  return (
    <div className="flex flex-col h-full bg-tg-bg overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2.5 safe-top border-b border-tg-border/20 [data-theme='manga']_&:border-b-0 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-tg-blue" />
          <h1 className="text-tg-text text-[22px] font-bold tracking-tight">Calendar</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Refresh */}
          <button
            disabled={isSyncing}
            onClick={() => handleSyncGithubAndErp()}
            className={clsx(
              'w-8 h-8 rounded-full bg-tg-bg-secondary border border-tg-border/30 flex items-center justify-center text-tg-text active:scale-95 transition-all',
              isSyncing && 'opacity-60 pointer-events-none'
            )}
            title="Refresh events from GitHub & ERP"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isSyncing && 'animate-spin text-tg-blue')} />
          </button>

          {/* Today Button */}
          <button
            onClick={handleToday}
            className="px-2.5 py-1 rounded-full bg-tg-bg-secondary text-tg-blue text-xs font-semibold border border-tg-border/30 active:scale-95 transition-transform"
          >
            Today
          </button>

          {/* Add Event Button */}
          <button
            onClick={() => setAddSheetOpen(true)}
            className="w-8 h-8 rounded-full bg-tg-blue text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm"
            aria-label="Add Event"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-4">
        {/* Month Selector Card */}
        <div className="bg-tg-surface rounded-2xl border border-tg-border/30 shadow-sm p-3.5">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-tg-text font-bold text-base">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-full hover:bg-tg-bg-secondary flex items-center justify-center text-tg-text active:scale-90 transition-transform"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-full hover:bg-tg-bg-secondary flex items-center justify-center text-tg-text active:scale-90 transition-transform"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels (Mon - Sun) */}
          <div className="grid grid-cols-7 text-center mb-1.5">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((wd, i) => (
              <span
                key={i}
                className={clsx(
                  'text-[11px] font-semibold tracking-wider py-1',
                  i >= 5 ? 'text-tg-blue/80' : 'text-tg-text-hint'
                )}
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {calendarDays.map((d, i) => {
              const dateStr = format(d, 'yyyy-MM-dd');
              const isCurrMonth = isSameMonth(d, currentMonth);
              const isSel = isSameDay(d, selectedDate);
              const isTod = isToday(d);
              const dayCategories = eventDatesMap.get(dateStr);
              const hasEvents = Boolean(dayCategories && dayCategories.length > 0);
              const hasGithub = dayCategories?.includes('github') || dayCategories?.includes('erp');

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(d)}
                  className="flex flex-col items-center justify-center h-9 relative active:scale-95 transition-transform"
                >
                  <div
                    className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                      isSel
                        ? 'bg-tg-blue text-white shadow-sm'
                        : isTod
                        ? 'bg-tg-blue/20 text-tg-blue font-bold'
                        : isCurrMonth
                        ? 'text-tg-text hover:bg-tg-bg-secondary/60'
                        : 'text-tg-text-hint/40'
                    )}
                  >
                    {format(d, 'd')}
                  </div>
                  {/* Indicator Dot for Days with Events / GitHub / ERP */}
                  {hasEvents && !isSel && (
                    <span
                      className={clsx(
                        'w-1.5 h-1.5 rounded-full absolute bottom-0.5',
                        hasGithub ? 'bg-purple-400' : 'bg-tg-blue'
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-tg-text font-bold text-sm flex items-center gap-1.5">
              <span>{format(selectedDate, 'EEEE, MMMM d')}</span>
              {isToday(selectedDate) && (
                <span className="text-[10px] font-bold text-tg-blue bg-tg-blue/15 px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </h3>
            <span className="text-tg-text-hint text-xs">
              {selectedEvents.length} {selectedEvents.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="bg-tg-surface/60 rounded-2xl border border-tg-border/20 p-6 text-center">
              <CalendarIcon className="w-8 h-8 text-tg-text-hint/60 mx-auto mb-2 opacity-50" />
              <p className="text-tg-text text-sm font-medium">No schedule on this date</p>
              <p className="text-tg-text-hint text-xs mt-1">Tap + to add or sync GitHub milestones</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  onClick={() => setAddSheetOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-tg-blue/10 text-tg-blue text-xs font-semibold active:scale-95 transition-transform inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Event
                </button>
                <button
                  onClick={() => handleSyncGithubAndErp()}
                  className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold active:scale-95 transition-transform inline-flex items-center gap-1"
                >
                  <GithubIcon className="w-3.5 h-3.5" />
                  Sync GitHub
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((evt) => {
                const meta = CATEGORY_META[evt.category] || CATEGORY_META.work;
                const IconComponent = meta.icon;
                return (
                  <div
                    key={evt.id}
                    className={clsx(
                      'bg-tg-surface rounded-2xl border border-tg-border/30 p-3.5 flex items-center gap-3 transition-all',
                      evt.completed && 'opacity-65'
                    )}
                  >
                    {/* Toggle Complete Checkbox */}
                    <button
                      onClick={() => handleToggleComplete(evt.id)}
                      className="shrink-0 text-tg-text-hint hover:text-tg-blue transition-colors"
                      aria-label="Toggle Complete"
                    >
                      <CheckCircle2
                        className={clsx(
                          'w-5 h-5 transition-colors',
                          evt.completed ? 'text-emerald-500 fill-emerald-500/20' : 'text-tg-border'
                        )}
                      />
                    </button>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0 text-left">
                      <p
                        className={clsx(
                          'text-[14px] font-semibold text-tg-text truncate',
                          evt.completed && 'line-through text-tg-text-hint'
                        )}
                      >
                        {evt.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-tg-text-hint">
                          <Clock className="w-3 h-3" />
                          <span>{evt.time}</span>
                        </span>

                        <span
                          className={clsx(
                            'text-[10.5px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1',
                            meta.color
                          )}
                        >
                          <IconComponent className="w-2.5 h-2.5" />
                          <span>{meta.label}</span>
                        </span>

                        {evt.sourceUrl && (
                          <a
                            href={evt.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-tg-blue hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Delete button (only for local events) */}
                    {evt.source === 'local' || !evt.source ? (
                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-tg-text-hint hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all shrink-0"
                        aria-label="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-7 h-7 flex items-center justify-center shrink-0">
                        {evt.category === 'github' ? (
                          <GithubIcon className="w-4 h-4 text-purple-400 opacity-70" />
                        ) : (
                          <Layers className="w-4 h-4 text-indigo-400 opacity-70" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Event Bottom Sheet */}
      <BottomSheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} title="New Calendar Event">
        <form onSubmit={handleAddEvent} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-tg-text-hint block mb-1.5">
              Event Title
            </label>
            <input
              type="text"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. ERP Release, Database Backup…"
              className="w-full bg-tg-bg-secondary rounded-xl px-3.5 py-2.5 text-sm text-tg-text placeholder:text-tg-text-hint border border-tg-border/30 focus:outline-none focus:border-tg-blue transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-tg-text-hint block mb-1.5">
                Date
              </label>
              <div className="bg-tg-bg-secondary rounded-xl px-3.5 py-2.5 text-sm text-tg-text border border-tg-border/30">
                {format(selectedDate, 'MMM d, yyyy')}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-tg-text-hint block mb-1.5">
                Time
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full bg-tg-bg-secondary rounded-xl px-3 py-2 text-sm text-tg-text border border-tg-border/30 focus:outline-none focus:border-tg-blue"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-tg-text-hint block mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['work', 'personal', 'reminder', 'urgent', 'erp', 'github'] as const).map((cat) => {
                const meta = CATEGORY_META[cat];
                const active = newCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={clsx(
                      'py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all',
                      active
                        ? 'bg-tg-blue text-white border-tg-blue shadow-sm'
                        : 'bg-tg-bg-secondary text-tg-text border-tg-border/30'
                    )}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-tg-blue text-white font-semibold text-sm active:scale-98 transition-transform shadow-md mt-2"
          >
            Create Event
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
