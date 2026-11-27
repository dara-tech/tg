'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  CheckCircle2,
  Tag,
  Bell,
  Briefcase,
  User,
  AlertCircle,
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
  category: 'personal' | 'work' | 'reminder' | 'urgent';
  completed?: boolean;
}

const STORAGE_KEY = 'tg_calendar_events_v1';

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-1',
    title: 'Weekly Team Sync',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '14:00',
    category: 'work',
  },
  {
    id: 'evt-2',
    title: 'Review Project Updates',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '17:30',
    category: 'reminder',
  },
  {
    id: 'evt-3',
    title: 'Doctor Appointment',
    date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    time: '09:00',
    category: 'personal',
  },
  {
    id: 'evt-4',
    title: 'Water Festival Holiday',
    date: format(addDays(new Date(), 4), 'yyyy-MM-dd'),
    time: '08:00',
    category: 'personal',
  },
];

const CATEGORY_META = {
  personal: { label: 'Personal', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', icon: User },
  work:     { label: 'Work',     color: 'bg-sky-500/15 text-sky-500 border-sky-500/30',         icon: Briefcase },
  reminder: { label: 'Reminder', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30',     icon: Bell },
  urgent:   { label: 'Urgent',   color: 'bg-rose-500/15 text-rose-500 border-rose-500/30',       icon: AlertCircle },
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

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newCategory, setNewCategory] = useState<CalendarEvent['category']>('personal');

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
    const map = new Set<string>();
    events.forEach((e) => map.add(e.date));
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
          <button
            onClick={handleToday}
            className="px-2.5 py-1 rounded-full bg-tg-bg-secondary text-tg-blue text-xs font-semibold border border-tg-border/30 active:scale-95 transition-transform"
          >
            Today
          </button>
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
              const hasEvents = eventDatesMap.has(dateStr);

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
                  {/* Indicator Dot for Days with Events */}
                  {hasEvents && !isSel && (
                    <span className="w-1 h-1 rounded-full bg-tg-blue absolute bottom-0.5" />
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
              {selectedEvents.length} {selectedEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="bg-tg-surface/60 rounded-2xl border border-tg-border/20 p-6 text-center">
              <CalendarIcon className="w-8 h-8 text-tg-text-hint/60 mx-auto mb-2 opacity-50" />
              <p className="text-tg-text text-sm font-medium">No events scheduled</p>
              <p className="text-tg-text-hint text-xs mt-1">Tap + to add a reminder or event</p>
              <button
                onClick={() => setAddSheetOpen(true)}
                className="mt-3 px-4 py-1.5 rounded-full bg-tg-blue/10 text-tg-blue text-xs font-semibold active:scale-95 transition-transform inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Event
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((evt) => {
                const meta = CATEGORY_META[evt.category];
                const IconComponent = meta.icon;
                return (
                  <div
                    key={evt.id}
                    className={clsx(
                      'bg-tg-surface rounded-2xl border border-tg-border/30 p-3.5 flex items-center gap-3 transition-all',
                      evt.completed && 'opacity-60'
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
                      <div className="flex items-center gap-2 mt-1">
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
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteEvent(evt.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-tg-text-hint hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all shrink-0"
                      aria-label="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
              placeholder="e.g. Team Meeting, Doctor Visit…"
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
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((cat) => {
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
