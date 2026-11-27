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
  Layers,
  LayoutGrid,
  ListOrdered,
  Landmark,
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { BankTransactionsModal, type BankTransaction } from '@/features/erp/BankTransactionsModal';
import { Avatar } from '@/components/ui/Avatar';
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
  githubUsername: string; // e.g. "dara-tech"
  githubRepo?: string; // optional backward compatibility
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
  githubUsername: 'dara-tech',
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

// Pastel / Vibrant aesthetics matching Image 2 reference design
const CARD_THEMES = [
  {
    bg: 'bg-[#F2C27D] dark:bg-[#5C3F16] text-[#2E1B04] dark:text-[#FBE5C3]',
    pill: 'bg-black/15 dark:bg-white/15 text-[#2E1B04] dark:text-[#FBE5C3]',
    sub: 'text-[#2E1B04]/75 dark:text-[#FBE5C3]/80',
    btn: 'hover:bg-black/10 dark:hover:bg-white/10 text-[#2E1B04] dark:text-[#FBE5C3]',
    chip: 'bg-[#402607] text-[#FBE5C3]',
  },
  {
    bg: 'bg-[#B4C4C2] dark:bg-[#1C3633] text-[#0E201E] dark:text-[#D8E6E4]',
    pill: 'bg-black/15 dark:bg-white/15 text-[#0E201E] dark:text-[#D8E6E4]',
    sub: 'text-[#0E201E]/75 dark:text-[#D8E6E4]/80',
    btn: 'hover:bg-black/10 dark:hover:bg-white/10 text-[#0E201E] dark:text-[#D8E6E4]',
    chip: 'bg-[#152B29] text-[#D8E6E4]',
  },
  {
    bg: 'bg-[#C6C0D9] dark:bg-[#322852] text-[#1E1738] dark:text-[#E2DCF5]',
    pill: 'bg-black/15 dark:bg-white/15 text-[#1E1738] dark:text-[#E2DCF5]',
    sub: 'text-[#1E1738]/75 dark:text-[#E2DCF5]/80',
    btn: 'hover:bg-black/10 dark:hover:bg-white/10 text-[#1E1738] dark:text-[#E2DCF5]',
    chip: 'bg-[#291F44] text-[#E2DCF5]',
  },
  {
    bg: 'bg-[#E4A9A8] dark:bg-[#521E1D] text-[#2F1111] dark:text-[#F9D4D3]',
    pill: 'bg-black/15 dark:bg-white/15 text-[#2F1111] dark:text-[#F9D4D3]',
    sub: 'text-[#2F1111]/75 dark:text-[#F9D4D3]/80',
    btn: 'hover:bg-black/10 dark:hover:bg-white/10 text-[#2F1111] dark:text-[#F9D4D3]',
    chip: 'bg-[#411515] text-[#F9D4D3]',
  },
  {
    bg: 'bg-[#A3CECD] dark:bg-[#153B39] text-[#0A2322] dark:text-[#CFF0EF]',
    pill: 'bg-black/15 dark:bg-white/15 text-[#0A2322] dark:text-[#CFF0EF]',
    sub: 'text-[#0A2322]/75 dark:text-[#CFF0EF]/80',
    btn: 'hover:bg-black/10 dark:hover:bg-white/10 text-[#0A2322] dark:text-[#CFF0EF]',
    chip: 'bg-[#133230] text-[#CFF0EF]',
  },
  {
    bg: 'bg-[#D7D8A9] dark:bg-[#3D3E1A] text-[#232408] dark:text-[#F2F3D2]',
    pill: 'bg-black/15 dark:bg-white/15 text-[#232408] dark:text-[#F2F3D2]',
    sub: 'text-[#232408]/75 dark:text-[#F2F3D2]/80',
    btn: 'hover:bg-black/10 dark:hover:bg-white/10 text-[#232408] dark:text-[#F2F3D2]',
    chip: 'bg-[#2F300F] text-[#F2F3D2]',
  },
];

export default function CalendarScreen() {
  const [activeView, setActiveView] = useState<'today' | 'calendar'>('today');
  const [calendarMode, setCalendarMode] = useState<'timeline' | 'grid'>('timeline');
  const [taskFilter, setTaskFilter] = useState<'all' | 'github' | 'erp' | 'reminders'>('all');

  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

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
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SYNC_CONFIG,
          ...parsed,
          githubUsername: parsed.githubUsername || (parsed.githubRepo ? parsed.githubRepo.split('/')[0] : 'dara-tech'),
        };
      }
    } catch {}
    return DEFAULT_SYNC_CONFIG;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);

  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newCategory, setNewCategory] = useState<CalendarEvent['category']>('work');

  // Clock ticker for dual timezones
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Reload sync config whenever user returns from Profile Settings
  useEffect(() => {
    const reloadConfig = () => {
      try {
        const stored = localStorage.getItem(SYNC_CONFIG_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSyncConfig({
            ...DEFAULT_SYNC_CONFIG,
            ...parsed,
            githubUsername: parsed.githubUsername || (parsed.githubRepo ? parsed.githubRepo.split('/')[0] : 'dara-tech'),
          });
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
  const todayKey = format(new Date(), 'yyyy-MM-dd');

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

  // Events for Today
  const todayEvents = useMemo(() => {
    return events
      .filter((e) => {
        if (taskFilter === 'github') return e.category === 'github';
        if (taskFilter === 'erp') return e.category === 'erp';
        if (taskFilter === 'reminders') return e.category === 'reminder' || e.category === 'urgent';
        return e.date === todayKey;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [events, todayKey, taskFilter]);

  // Selected date events
  const selectedEvents = useMemo(() => {
    return events.filter((e) => e.date === selectedKey).sort((a, b) => a.time.localeCompare(b.time));
  }, [events, selectedKey]);

  // Month days for multi-day card timeline view
  const monthTimelineDays = useMemo(() => {
    const list: Date[] = [];
    let day = monthStart;
    while (day <= monthEnd) {
      list.push(day);
      day = addDays(day, 1);
    }
    return list;
  }, [monthStart, monthEnd]);

  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
    setActiveView('today');
  };

  /**
   * Syncs milestones, issues, and releases from GitHub by Username & ERP
   */
  const handleSyncGithubAndErp = useCallback(async (customCfg?: SyncConfig) => {
    let cfg = customCfg || syncConfig;
    try {
      const stored = localStorage.getItem(SYNC_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        cfg = {
          ...DEFAULT_SYNC_CONFIG,
          ...parsed,
          githubUsername: parsed.githubUsername || (parsed.githubRepo ? parsed.githubRepo.split('/')[0] : 'dara-tech'),
        };
        setSyncConfig(cfg);
      }
    } catch {}

    const username = (cfg.githubUsername || (cfg.githubRepo ? cfg.githubRepo.split('/')[0] : '')).trim().replace(/^@/, '');

    if (!username && !cfg.erpApiUrl.trim()) {
      toast('Configure GitHub Username in Profile Settings', 'error');
      return;
    }

    setIsSyncing(true);
    const newSyncedEvents: CalendarEvent[] = [];

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (cfg.githubToken.trim()) {
      const t = cfg.githubToken.trim();
      headers.Authorization = t.startsWith('github_pat_') || t.startsWith('ghp_') ? `Bearer ${t}` : `token ${t}`;
    }

    try {
      // 1. Fetch GitHub User Activity Stream (Pushes, Commits, Activity)
      if (username) {
        try {
          const evRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=40`, {
            headers,
          });
          if (evRes.ok) {
            const evData = await evRes.json();
            if (Array.isArray(evData)) {
              evData.forEach((ev: {
                id: string;
                type: string;
                created_at: string;
                repo: { name: string };
                payload?: { ref?: string; action?: string; issue?: { title?: string; number?: number }; pull_request?: { title?: string; number?: number } };
              }) => {
                const targetDate = format(new Date(ev.created_at), 'yyyy-MM-dd');
                const time = ev.created_at.slice(11, 16) || '12:00';
                const repoShort = ev.repo?.name?.split('/')[1] || ev.repo?.name || 'repo';

                let title = `[${ev.type.replace('Event', '')} · ${repoShort}]`;
                if (ev.type === 'PushEvent') {
                  const branch = ev.payload?.ref?.replace('refs/heads/', '') || 'main';
                  title = `[Push · ${repoShort}] Pushed to ${branch}`;
                } else if (ev.type === 'PullRequestEvent') {
                  title = `[PR · ${repoShort}] ${ev.payload?.action || 'updated'} #${ev.payload?.pull_request?.number || ''}`;
                } else if (ev.type === 'IssuesEvent') {
                  title = `[Issue · ${repoShort}] ${ev.payload?.action || 'activity'} #${ev.payload?.issue?.number || ''}`;
                } else if (ev.type === 'CreateEvent') {
                  title = `[Branch · ${repoShort}] Created ${ev.payload?.ref || 'ref'}`;
                } else if (ev.type === 'ReleaseEvent') {
                  title = `[Release · ${repoShort}] Published release`;
                }

                newSyncedEvents.push({
                  id: `gh-ev-${ev.id}`,
                  title,
                  date: targetDate,
                  time,
                  category: 'github',
                  source: 'github',
                  sourceUrl: `https://github.com/${ev.repo.name}`,
                  completed: true,
                  sourceMeta: { repo: ev.repo.name, type: 'issue' },
                });
              });
            }
          }
        } catch (err) {
          console.warn('[Calendar] GitHub user events stream failed:', err);
        }
      }

      // 2. Fetch GitHub Issues / PRs involving the user across GitHub
      if (username && cfg.syncIssues) {
        try {
          const query = encodeURIComponent(`involves:${username}`);
          const res = await fetch(`https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=40`, {
            headers,
          });
          if (res.ok) {
            const data = await res.json();
            const items = data.items || [];
            if (Array.isArray(items)) {
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              items.forEach((iss: {
                id: number;
                number: number;
                title: string;
                html_url: string;
                created_at: string;
                closed_at?: string;
                milestone?: { due_on?: string; title?: string };
                pull_request?: unknown;
                state?: string;
                repository_url: string;
              }) => {
                const isPr = Boolean(iss.pull_request);
                const repoName = iss.repository_url ? iss.repository_url.split('/').slice(-2).join('/') : '';
                const isOpen = iss.state === 'open';
                const targetDate = iss.milestone?.due_on
                  ? format(new Date(iss.milestone.due_on), 'yyyy-MM-dd')
                  : isOpen
                  ? todayStr
                  : format(new Date(iss.closed_at || iss.created_at), 'yyyy-MM-dd');

                newSyncedEvents.push({
                  id: `gh-i-${iss.id}`,
                  title: `${isPr ? '[PR' : '[Issue'} #${iss.number}${repoName ? ` · ${repoName.split('/')[1] || repoName}` : ''}] ${iss.title}`,
                  date: targetDate,
                  time: '14:00',
                  category: 'github',
                  source: 'github',
                  sourceUrl: iss.html_url,
                  completed: !isOpen,
                  sourceMeta: { repo: repoName, number: iss.number, type: isPr ? 'pr' : 'issue' },
                });
              });
            }
          }
        } catch (err) {
          console.warn('[Calendar] GitHub user issues sync failed:', err);
        }
      }

      // 3. Fetch User Repositories to extract Milestones & Releases
      if (username && (cfg.syncMilestones || cfg.syncReleases)) {
        try {
          const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=6`, {
            headers,
          });
          if (reposRes.ok) {
            const repos = await reposRes.json();
            if (Array.isArray(repos)) {
              for (const repo of repos) {
                if (cfg.syncMilestones && repo.full_name) {
                  try {
                    const mRes = await fetch(`https://api.github.com/repos/${repo.full_name}/milestones?state=all&per_page=10`, {
                      headers,
                    });
                    if (mRes.ok) {
                      const milestones = await mRes.json();
                      if (Array.isArray(milestones)) {
                        milestones.forEach((m: { id: number; title: string; due_on?: string; html_url?: string; state?: string }) => {
                          const targetDate = m.due_on ? format(new Date(m.due_on), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
                          newSyncedEvents.push({
                            id: `gh-m-${m.id}`,
                            title: `[Milestone · ${repo.name}] ${m.title}`,
                            date: targetDate,
                            time: '10:00',
                            category: 'github',
                            source: 'github',
                            sourceUrl: m.html_url,
                            completed: m.state === 'closed',
                            sourceMeta: { repo: repo.full_name, type: 'milestone' },
                          });
                        });
                      }
                    }
                  } catch {}
                }

                if (cfg.syncReleases && repo.full_name && repos.indexOf(repo) < 3) {
                  try {
                    const rRes = await fetch(`https://api.github.com/repos/${repo.full_name}/releases?per_page=5`, {
                      headers,
                    });
                    if (rRes.ok) {
                      const releases = await rRes.json();
                      if (Array.isArray(releases)) {
                        releases.forEach((rel: { id: number; name?: string; tag_name: string; published_at: string; html_url: string }) => {
                          const targetDate = format(new Date(rel.published_at), 'yyyy-MM-dd');
                          newSyncedEvents.push({
                            id: `gh-r-${rel.id}`,
                            title: `[Release · ${repo.name}] ${rel.name || rel.tag_name}`,
                            date: targetDate,
                            time: '12:00',
                            category: 'github',
                            source: 'github',
                            sourceUrl: rel.html_url,
                            completed: true,
                            sourceMeta: { repo: repo.full_name, type: 'release' },
                          });
                        });
                      }
                    }
                  } catch {}
                }
              }
            }
          }
        } catch (err) {
          console.warn('[Calendar] GitHub repos sync failed:', err);
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
      toast(`Synced ${newSyncedEvents.length} items for @${username || 'GitHub'}`, 'success');
    } catch {
      toast('Failed to sync GitHub / ERP calendar', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [syncConfig]);

  useEffect(() => {
    const lastSync = syncConfig.lastSyncedAt || 0;
    if (Date.now() - lastSync > 15 * 60 * 1000) {
      handleSyncGithubAndErp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSyncBankToCalendar = (tx: BankTransaction) => {
    const symbol = tx.currency === 'USD' ? '$' : '៛';
    const amountStr = `${tx.type === 'credit' ? '+' : '-'}${symbol}${tx.amount.toLocaleString()}`;
    const newEvt: CalendarEvent = {
      id: `bank-tx-${tx.id}`,
      title: `[${tx.bank} ${tx.type === 'credit' ? 'Income' : 'Expense'}] ${amountStr} · ${tx.description}`,
      date: tx.date,
      time: tx.time || '12:00',
      category: 'erp',
      source: 'erp',
      completed: true,
      sourceMeta: { type: 'erp' },
    };
    setEvents((prev) => [newEvt, ...prev]);
    toast(`Synced ${tx.bank} transaction to Calendar`, 'success');
  };

  // Dual clock strings
  const localTimeStr = format(currentTime, 'h:mm a');
  const utcTimeStr = currentTime.toLocaleTimeString('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate an end time roughly 30-45 mins after start time
  const calculateEndTime = (start: string) => {
    const [h, m] = start.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '17:00';
    const total = h * 60 + m + 30;
    const endH = Math.floor(total / 60) % 24;
    const endM = total % 60;
    const period = endH >= 12 ? 'PM' : 'AM';
    const displayH = endH % 12 || 12;
    return `${displayH}:${endM.toString().padStart(2, '0')} ${period}`;
  };

  const formatDisplayTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="flex flex-col h-full bg-tg-bg overflow-hidden select-none">
      {/* Top Header / View Toggle (Image 2 style) */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 safe-top shrink-0">
        {/* Segmented Pill: [ Today ] [ Calendar ] */}
        <div className="flex items-center bg-tg-bg-secondary p-1 rounded-full border border-tg-border/30 shadow-inner">
          <button
            onClick={() => setActiveView('today')}
            className={clsx(
              'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
              activeView === 'today'
                ? 'bg-tg-text text-tg-bg shadow-sm scale-[1.02]'
                : 'text-tg-text-secondary hover:text-tg-text'
            )}
          >
            Today
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={clsx(
              'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
              activeView === 'calendar'
                ? 'bg-tg-text text-tg-bg shadow-sm scale-[1.02]'
                : 'text-tg-text-secondary hover:text-tg-text'
            )}
          >
            Calendar
          </button>
        </div>

        {/* Action Buttons: ERP Bank + Refresh Sync + Add (+) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBankModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 active:scale-95 transition-all shadow-xs"
            title="ERP Bank & Transactions Ledger"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ERP Bank</span>
          </button>

          <button
            disabled={isSyncing}
            onClick={() => handleSyncGithubAndErp()}
            className={clsx(
              'w-9 h-9 rounded-full bg-tg-bg-secondary border border-tg-border/30 flex items-center justify-center text-tg-text active:scale-95 transition-all shadow-sm hover:border-tg-border/60',
              isSyncing && 'opacity-60 pointer-events-none'
            )}
            title="Sync GitHub & ERP"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isSyncing && 'animate-spin text-tg-blue')} />
          </button>

          <button
            onClick={() => setAddSheetOpen(true)}
            className="w-9 h-9 rounded-full bg-tg-bg-secondary border border-tg-border/30 flex items-center justify-center text-tg-text active:scale-95 transition-all shadow-sm hover:border-tg-border/60"
            aria-label="Add event"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-6 space-y-4">
        {/* ========================================================================= */}
        {/* SCREEN 1: TODAY VIEW                                                     */}
        {/* ========================================================================= */}
        {activeView === 'today' && (
          <div className="space-y-4 pt-1">
            {/* Date Hero + Dual World Clocks (Screenshot Left) */}
            <div className="flex items-start justify-between px-2 pt-1 pb-1">
              <div>
                <p className="text-tg-text-secondary text-sm font-bold tracking-wide">
                  {format(new Date(), 'EEEE')}
                </p>
                <h1 className="text-[46px] sm:text-[54px] font-black tracking-tighter text-tg-text leading-none mt-1">
                  {format(new Date(), 'dd.MM')}
                </h1>
                <p className="text-[30px] sm:text-[38px] font-black tracking-tight text-tg-text-secondary/70 leading-none mt-0.5 uppercase">
                  {format(new Date(), 'MMM')}
                </p>
              </div>

              {/* World Clocks */}
              <div className="space-y-2.5 pt-1 text-right">
                <div>
                  <p className="text-[17px] font-extrabold text-tg-text tracking-tight font-mono">{localTimeStr}</p>
                  <p className="text-[11px] font-semibold text-tg-text-secondary">Local Time</p>
                </div>
                <div>
                  <p className="text-[15px] font-bold text-tg-text/80 tracking-tight font-mono">{utcTimeStr}</p>
                  <p className="text-[11px] font-semibold text-tg-text-secondary">UTC / GitHub</p>
                </div>
              </div>
            </div>

            {/* Filter Bar: [ Todays tasks ] [ Reminders ] */}
            <div className="flex items-center justify-between px-2 pt-2 border-t border-tg-border/15">
              <button
                onClick={() => setTaskFilter('all')}
                className={clsx(
                  'text-[17px] font-bold tracking-tight transition-colors',
                  taskFilter === 'all' ? 'text-tg-text' : 'text-tg-text-secondary hover:text-tg-text'
                )}
              >
                Todays tasks
                <span className="ml-1.5 text-xs px-2 py-0.5 rounded-full bg-tg-bg-secondary text-tg-text-secondary border border-tg-border/20">
                  {todayEvents.length}
                </span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTaskFilter('github')}
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95',
                    taskFilter === 'github'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-tg-bg-secondary text-tg-text-secondary border-tg-border/30 hover:text-tg-text'
                  )}
                >
                  GitHub
                </button>
                <button
                  onClick={() => setTaskFilter('reminders')}
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95',
                    taskFilter === 'reminders'
                      ? 'bg-tg-text text-tg-bg border-tg-text shadow-sm'
                      : 'bg-tg-bg-secondary text-tg-text-secondary border-tg-border/30 hover:text-tg-text'
                  )}
                >
                  Reminders
                </button>
              </div>
            </div>

            {/* Tasks Cards Stack */}
            {todayEvents.length === 0 ? (
              <div className="bg-tg-bg-secondary/60 rounded-3xl border border-tg-border/20 p-8 text-center space-y-3">
                <CalendarIcon className="w-10 h-10 text-tg-text-hint/40 mx-auto stroke-[1.5]" />
                <p className="text-tg-text font-bold text-base">No tasks for today</p>
                <p className="text-tg-text-hint text-xs max-w-xs mx-auto">
                  Syncing from GitHub @{syncConfig.githubUsername || 'dara-tech'} or tap + to create a custom reminder.
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    onClick={() => setAddSheetOpen(true)}
                    className="px-4 py-2 rounded-full bg-tg-text text-tg-bg text-xs font-bold active:scale-95 transition-transform"
                  >
                    + Add Task
                  </button>
                  <button
                    onClick={() => handleSyncGithubAndErp()}
                    className="px-4 py-2 rounded-full bg-tg-bg-secondary text-tg-text border border-tg-border/30 text-xs font-bold active:scale-95 transition-transform flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sync Now</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((evt, idx) => {
                  const theme = CARD_THEMES[idx % CARD_THEMES.length];
                  const meta = CATEGORY_META[evt.category] || CATEGORY_META.work;
                  const isGh = evt.category === 'github';
                  const startTime = formatDisplayTime(evt.time);
                  const endTime = calculateEndTime(evt.time);

                  return (
                    <div
                      key={evt.id}
                      className={clsx(
                        'rounded-[24px] p-5 shadow-sm transition-all relative overflow-hidden',
                        theme.bg,
                        evt.completed && 'opacity-60 saturate-50'
                      )}
                    >
                      {/* Top Row: Title + Right Badge/Avatar */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className={clsx('text-[19px] font-extrabold tracking-tight leading-snug line-clamp-2', evt.completed && 'line-through')}>
                            {evt.title}
                          </h3>
                          {evt.sourceUrl && (
                            <a
                              href={evt.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={clsx('inline-flex items-center gap-1 text-[11px] font-bold hover:underline mt-1', theme.sub)}
                            >
                              <span>{evt.sourceMeta?.repo || 'View on GitHub'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Right Avatar / Icon */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {isGh ? (
                            <div className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                              <GithubIcon className="w-5 h-5" />
                            </div>
                          ) : (
                            <Avatar letters={evt.title.slice(0, 2).toUpperCase()} size="sm" />
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Start - Duration Pill - End - Actions */}
                      <div className="flex items-end justify-between pt-5 border-t border-black/10 dark:border-white/10 mt-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm font-black tracking-tight">{startTime}</p>
                            <p className={clsx('text-[10px] font-bold uppercase tracking-wider', theme.sub)}>Start</p>
                          </div>

                          <div className={clsx('px-3 py-1 rounded-full text-[11px] font-extrabold shadow-inner', theme.pill)}>
                            {isGh ? 'GitHub' : meta.label}
                          </div>

                          <div>
                            <p className="text-sm font-black tracking-tight">{endTime}</p>
                            <p className={clsx('text-[10px] font-bold uppercase tracking-wider', theme.sub)}>End</p>
                          </div>
                        </div>

                        {/* Actions: Toggle Complete & Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleComplete(evt.id)}
                            className={clsx('w-8 h-8 rounded-full flex items-center justify-center transition-all', theme.btn)}
                            title={evt.completed ? 'Mark incomplete' : 'Mark completed'}
                          >
                            <CheckCircle2
                              className={clsx(
                                'w-5 h-5 transition-transform',
                                evt.completed ? 'fill-current stroke-current scale-110' : 'opacity-70'
                              )}
                            />
                          </button>

                          {(evt.source === 'local' || !evt.source) && (
                            <button
                              onClick={() => handleDeleteEvent(evt.id)}
                              className={clsx('w-8 h-8 rounded-full flex items-center justify-center transition-all', theme.btn)}
                              title="Delete event"
                            >
                              <Trash2 className="w-4 h-4 opacity-70 hover:opacity-100" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: CALENDAR VIEW (Image 2 Right side style)                       */}
        {/* ========================================================================= */}
        {activeView === 'calendar' && (
          <div className="space-y-4 pt-1">
            {/* Month Timeline Navigation: NOV < DEC > JAN */}
            <div className="flex items-center justify-between px-3 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-tg-text-hint tracking-wider uppercase">
                  {format(subMonths(currentMonth, 1), 'MMM')}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="w-7 h-7 rounded-full hover:bg-tg-bg-secondary flex items-center justify-center text-tg-text active:scale-90 transition-transform"
                    aria-label="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-base font-black tracking-tight text-tg-text uppercase px-1">
                    {format(currentMonth, 'MMM yyyy')}
                  </span>

                  <button
                    onClick={handleNextMonth}
                    className="w-7 h-7 rounded-full hover:bg-tg-bg-secondary flex items-center justify-center text-tg-text active:scale-90 transition-transform"
                    aria-label="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-xs font-bold text-tg-text-hint tracking-wider uppercase">
                  {format(addMonths(currentMonth, 1), 'MMM')}
                </span>
              </div>

              {/* View Switcher: Stacked Timeline vs Grid */}
              <div className="flex items-center bg-tg-bg-secondary p-0.5 rounded-xl border border-tg-border/25">
                <button
                  onClick={() => setCalendarMode('timeline')}
                  className={clsx(
                    'p-1.5 rounded-lg transition-colors',
                    calendarMode === 'timeline' ? 'bg-tg-text text-tg-bg' : 'text-tg-text-hint hover:text-tg-text'
                  )}
                  title="Timeline Cards"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCalendarMode('grid')}
                  className={clsx(
                    'p-1.5 rounded-lg transition-colors',
                    calendarMode === 'grid' ? 'bg-tg-text text-tg-bg' : 'text-tg-text-hint hover:text-tg-text'
                  )}
                  title="Monthly Grid"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* TIMELINE MODE: Stacked Day Timeline Cards (Image 2 Right Screen) */}
            {calendarMode === 'timeline' && (
              <div className="space-y-3">
                {monthTimelineDays.map((day, idx) => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const dayEvents = events.filter((e) => e.date === dayKey);
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDay = isToday(day);
                  const theme = CARD_THEMES[idx % CARD_THEMES.length];

                  // Hourly event buckets
                  const morningEvent = dayEvents.find((e) => parseInt(e.time) < 12);
                  const afternoonEvent = dayEvents.find((e) => parseInt(e.time) >= 12 && parseInt(e.time) < 16);
                  const eveningEvent = dayEvents.find((e) => parseInt(e.time) >= 16);

                  return (
                    <div
                      key={dayKey}
                      onClick={() => setSelectedDate(day)}
                      className={clsx(
                        'rounded-[24px] p-4 shadow-sm transition-all flex items-stretch gap-4 cursor-pointer',
                        theme.bg,
                        isSelected && 'ring-2 ring-tg-blue scale-[1.01]'
                      )}
                    >
                      {/* Left Column: Big Date */}
                      <div className="w-20 shrink-0 flex flex-col justify-between border-r border-black/10 dark:border-white/10 pr-3">
                        <div>
                          <p className={clsx('text-[11px] font-extrabold uppercase tracking-wider', theme.sub)}>
                            {format(day, 'EEEE')}
                          </p>
                          <h2 className="text-[34px] font-black tracking-tighter leading-none mt-1">
                            {format(day, 'd')}
                          </h2>
                          <p className="text-xs font-black tracking-tight uppercase mt-0.5">
                            {format(day, 'MMM')}
                          </p>
                        </div>

                        {isTodayDay && (
                          <span className="inline-block mt-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-black/20 dark:bg-white/20 tracking-wider">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Right Column: Time Slots & Event Chips */}
                      <div className="flex-1 min-w-0 grid grid-cols-3 gap-1 items-center">
                        {/* Slot 1: Morning / 9 AM */}
                        <div className="h-full flex flex-col justify-between py-1 border-r border-black/5 dark:border-white/5 pr-1">
                          <span className={clsx('text-[10px] font-extrabold tracking-wider', theme.sub)}>9 am</span>
                          {morningEvent ? (
                            <div className={clsx('px-2 py-1.5 rounded-xl text-[10px] font-extrabold shadow-sm truncate', theme.chip)}>
                              {morningEvent.title.replace(/^\[.*?\]\s*/, '')}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(day);
                                setNewTime('09:00');
                                setAddSheetOpen(true);
                              }}
                              className={clsx('w-6 h-6 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity', theme.btn)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Slot 2: Afternoon / 12 PM - 3 PM */}
                        <div className="h-full flex flex-col justify-between py-1 border-r border-black/5 dark:border-white/5 pr-1">
                          <span className={clsx('text-[10px] font-extrabold tracking-wider', theme.sub)}>2 pm</span>
                          {afternoonEvent ? (
                            <div className={clsx('px-2 py-1.5 rounded-xl text-[10px] font-extrabold shadow-sm truncate', theme.chip)}>
                              {afternoonEvent.title.replace(/^\[.*?\]\s*/, '')}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(day);
                                setNewTime('14:00');
                                setAddSheetOpen(true);
                              }}
                              className={clsx('w-6 h-6 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity', theme.btn)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Slot 3: Evening / 5 PM */}
                        <div className="h-full flex flex-col justify-between py-1 pl-1">
                          <span className={clsx('text-[10px] font-extrabold tracking-wider', theme.sub)}>5 pm</span>
                          {eveningEvent ? (
                            <div className={clsx('px-2 py-1.5 rounded-xl text-[10px] font-extrabold shadow-sm truncate', theme.chip)}>
                              {eveningEvent.title.replace(/^\[.*?\]\s*/, '')}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(day);
                                setNewTime('17:00');
                                setAddSheetOpen(true);
                              }}
                              className={clsx('w-6 h-6 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity', theme.btn)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* GRID MODE: Classic Month Grid */}
            {calendarMode === 'grid' && (
              <div className="space-y-4">
                <div className="bg-tg-bg-secondary rounded-3xl border border-tg-border/25 shadow-sm p-4">
                  <div className="grid grid-cols-7 text-center mb-2">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((wd, i) => (
                      <span key={i} className="text-[11px] font-bold text-tg-text-hint py-1">
                        {wd}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-1.5 text-center">
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
                          className="flex flex-col items-center justify-center h-10 relative active:scale-95 transition-transform"
                        >
                          <div
                            className={clsx(
                              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                              isSel
                                ? 'bg-tg-blue text-white shadow-sm'
                                : isTod
                                ? 'bg-tg-blue/20 text-tg-blue font-extrabold'
                                : isCurrMonth
                                ? 'text-tg-text hover:bg-tg-surface'
                                : 'text-tg-text-hint/40'
                            )}
                          >
                            {format(d, 'd')}
                          </div>
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

                {/* Selected Day Agenda in Grid Mode */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-tg-text font-bold text-sm">
                      {format(selectedDate, 'EEEE, MMMM d')}
                    </h3>
                    <span className="text-xs font-semibold text-tg-text-hint">
                      {selectedEvents.length} {selectedEvents.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>

                  {selectedEvents.length === 0 ? (
                    <div className="bg-tg-bg-secondary/40 rounded-2xl border border-tg-border/20 p-6 text-center text-tg-text-hint text-xs">
                      No events on {format(selectedDate, 'MMMM d')}. Tap + to add.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className="bg-tg-bg-secondary rounded-2xl border border-tg-border/30 p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button onClick={() => handleToggleComplete(evt.id)}>
                              <CheckCircle2
                                className={clsx(
                                  'w-5 h-5',
                                  evt.completed ? 'text-emerald-500 fill-emerald-500/20' : 'text-tg-border'
                                )}
                              />
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={clsx('text-sm font-bold text-tg-text truncate', evt.completed && 'line-through text-tg-text-hint')}>
                                {evt.title}
                              </p>
                              <p className="text-xs text-tg-text-hint mt-0.5">{evt.time}</p>
                            </div>
                          </div>
                          {(evt.source === 'local' || !evt.source) && (
                            <button
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="text-tg-text-hint hover:text-rose-500 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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

      {/* ERP Bank Transactions Modal */}
      <BankTransactionsModal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        onSyncToCalendar={handleSyncBankToCalendar}
      />
    </div>
  );
}
