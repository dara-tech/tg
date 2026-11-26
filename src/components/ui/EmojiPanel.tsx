'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Clock, Search, X } from 'lucide-react';
import {
  downloadMediaUrl,
  fetchRealStickerSets,
  fetchSavedGifs,
  isMTProtoConfigured,
  type StickerItem,
  type StickerSetItem,
} from '@/services/telegram.real';
import clsx from 'clsx';

const CATEGORIES = [
  { label: '😀', emojis: ['😀','😂','🥹','😊','😇','🥰','😍','🤩','😘','😗','😙','😚','🙂','🤗','🤭','🫣','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','🫨','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','💫','🤯','🤠','🥳','🥸','😎','🤓','🧐'] },
  { label: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','✨','💯','🙏','👏'] },
  { label: '🎉', emojis: ['🎉','🎊','🎈','🎁','🏆','🥇','🥈','🥉','🎯','🎳','🎮','🎲','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸'] },
  { label: '🐶', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐺','🦄'] },
  { label: '🍎', emojis: ['🍎','🍊','🍋','🍌','🍍','🥭','🍓','🫐','🍒','🍑','🥝','🍅','🥑','🍔','🍟','🍕','🍣','🍜','🍰','☕'] },
  { label: '🚗', emojis: ['🚗','🚕','🚙','🚌','🏎','🚓','🚑','🚒','✈️','🚀','🛸','⛵','🚲','🛵','🏠','🏢'] },
];

const QUICK_MOODS = ['❤️', '👍', '👎', '🎉', '👋', '😀', '😢', '😡'];

function StickerThumb({ item, className }: { item: StickerItem; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canRenderImg = Boolean(item.mimeType?.startsWith('image/') || item.mimeType === 'application/x-tgsticker');
  const canRenderVideo = Boolean(item.mimeType?.startsWith('video/'));

  useEffect(() => {
    if ((!canRenderImg && !canRenderVideo) || !isMTProtoConfigured()) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    downloadMediaUrl({
      kind: 'sticker',
      id: item.id,
      accessHash: item.accessHash,
      fileReference: item.fileReference,
      dcId: item.dcId,
      mimeType: item.mimeType,
      thumbSize: item.thumbSize || 'm',
    })
      .then((u) => {
        if (active && u) setUrl(u);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [canRenderImg, canRenderVideo, item]);

  if (url) {
    if (canRenderVideo) {
      return <video src={url} autoPlay loop muted playsInline className={clsx('object-contain select-none', className ?? 'w-full h-full')} />;
    }
    return <img src={url} alt={item.alt} className={clsx('object-contain select-none', className ?? 'w-full h-full')} />;
  }

  if (loading) {
    return (
      <div className={clsx('rounded-xl bg-tg-surface/60 animate-pulse flex items-center justify-center', className ?? 'w-full h-full')}>
        <div className="w-3.5 h-3.5 rounded-full bg-tg-border/50" />
      </div>
    );
  }

  return (
    <div className={clsx('rounded-xl bg-tg-surface/40 flex items-center justify-center text-tg-text-hint/40', className ?? 'w-full h-full')}>
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm6 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
      </svg>
    </div>
  );
}

function GifThumb({ item }: { item: StickerItem }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isMTProtoConfigured()) return;
    let active = true;
    downloadMediaUrl({
      kind: 'video',
      id: item.id,
      accessHash: item.accessHash,
      fileReference: item.fileReference,
      dcId: item.dcId,
      mimeType: item.mimeType || 'video/mp4',
    }).then((u) => {
      if (active && u) setUrl(u);
    });
    return () => { active = false; };
  }, [item]);

  if (url) {
    return <video src={url} autoPlay loop muted playsInline className="w-full h-full object-cover" />;
  }
  return <div className="w-full h-full bg-tg-surface/60 animate-pulse rounded-xl" />;
}

interface EmojiPanelProps {
  onSelect: (emoji: string) => void;
  onSelectSticker?: (sticker: StickerItem) => void;
  onClose: () => void;
}

export function EmojiPanel({ onSelect, onSelectSticker, onClose }: EmojiPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'gifs' | 'stickers' | 'emoji'>('stickers');
  const [favorites, setFavorites] = useState<StickerItem[]>([]);
  const [sets, setSets] = useState<StickerSetItem[]>([]);
  const [gifs, setGifs] = useState<StickerItem[]>([]);
  const [activeSetId, setActiveSetId] = useState<string>('fav');
  const [search, setSearch] = useState('');
  const [moodFilter, setMoodFilter] = useState<string>('');
  const [loadingStickers, setLoadingStickers] = useState(false);
  const [loadingGifs, setLoadingGifs] = useState(false);

  useEffect(() => {
    if (!isMTProtoConfigured()) return;
    setLoadingStickers(true);
    fetchRealStickerSets()
      .then((res) => {
        setFavorites(res.favorites);
        setSets(res.sets);
        if (res.favorites.length === 0 && res.sets[0]) {
          setActiveSetId(res.sets[0].id);
        }
      })
      .finally(() => setLoadingStickers(false));
  }, []);

  useEffect(() => {
    if (mode !== 'gifs' || gifs.length > 0 || !isMTProtoConfigured()) return;
    setLoadingGifs(true);
    fetchSavedGifs()
      .then(setGifs)
      .finally(() => setLoadingGifs(false));
  }, [mode, gifs.length]);

  const displayedStickers = useMemo(() => {
    const allStickers = [...favorites, ...sets.flatMap((s) => s.stickers)];
    if (moodFilter) {
      return allStickers.filter((s) => s.alt === moodFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return allStickers.filter((s) => s.alt.includes(q));
    }
    if (activeSetId === 'fav') {
      return favorites.length > 0 ? favorites : (sets[0]?.stickers ?? []);
    }
    return sets.find((s) => s.id === activeSetId)?.stickers ?? [];
  }, [activeSetId, favorites, moodFilter, search, sets]);

  const activeSetTitle = useMemo(() => {
    if (moodFilter) return `MATCHING ${moodFilter}`;
    if (search.trim()) return 'SEARCH RESULTS';
    if (activeSetId === 'fav') return favorites.length > 0 ? 'FAVORITE STICKERS' : (sets[0]?.title.toUpperCase() || 'STICKERS');
    return sets.find((s) => s.id === activeSetId)?.title.toUpperCase() || 'STICKERS';
  }, [activeSetId, favorites.length, moodFilter, search, sets]);

  return (
    <div ref={ref} className="bg-tg-bg-secondary/95 backdrop-blur-xl border-t border-tg-border animate-slide-up relative">
      {/* Top Pack Thumbnails Strip (Stickers mode) */}
      {mode === 'stickers' && (
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={() => { setActiveSetId('fav'); setMoodFilter(''); }}
            className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
              activeSetId === 'fav' && !moodFilter ? 'bg-tg-surface text-tg-blue' : 'text-tg-text-secondary'
            )}
            aria-label="Favorite Stickers"
          >
            <Bookmark className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (sets[0]) setActiveSetId(sets[0].id);
              setMoodFilter('');
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-tg-text-secondary"
            aria-label="Recent Stickers"
          >
            <Clock className="w-4 h-4" />
          </button>
          {sets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setActiveSetId(s.id); setMoodFilter(''); }}
              className={clsx(
                'w-8 h-8 rounded-lg p-1 flex items-center justify-center shrink-0 transition-colors',
                activeSetId === s.id && !moodFilter ? 'bg-tg-surface ring-1 ring-tg-border' : 'hover:bg-tg-surface/60'
              )}
              title={s.title}
            >
              {s.stickers[0] && <StickerThumb item={s.stickers[0]} className="w-6 h-6" />}
            </button>
          ))}
        </div>
      )}

      {/* Search + Quick Mood Reactions Bar */}
      <div className="px-3 pt-1.5 pb-2">
        <div className="h-9 rounded-full bg-tg-surface border border-tg-border/70 px-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-tg-text-hint shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-20 min-w-0 flex-1 bg-transparent text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none"
          />
          {mode === 'stickers' && (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide shrink-0">
              {QUICK_MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMoodFilter((prev) => (prev === m ? '' : m))}
                  className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-sm transition-transform active:scale-110',
                    moodFilter === m ? 'bg-tg-blue/20 ring-1 ring-tg-blue' : 'opacity-70 hover:opacity-100'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          {(search || moodFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setMoodFilter(''); }}
              className="text-tg-text-hint hover:text-tg-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="h-56 overflow-y-auto scrollbar-hide px-3 pb-14">
        {mode === 'stickers' && (
          <>
            <p className="text-[11px] font-semibold tracking-wider text-tg-text-hint uppercase mb-2 text-center">
              {activeSetTitle}
            </p>
            {loadingStickers ? (
              <p className="text-tg-text-hint text-xs text-center mt-14">Loading stickers…</p>
            ) : displayedStickers.length === 0 ? (
              <p className="text-tg-text-hint text-xs text-center mt-14">No stickers found</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {displayedStickers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { onSelectSticker?.(s); onClose(); }}
                    className="aspect-square rounded-xl p-1 flex items-center justify-center hover:bg-tg-surface active:scale-95 transition-transform"
                  >
                    <StickerThumb item={s} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {mode === 'gifs' && (
          <>
            <p className="text-[11px] font-semibold tracking-wider text-tg-text-hint uppercase mb-2 text-center">
              SAVED GIFS
            </p>
            {loadingGifs ? (
              <p className="text-tg-text-hint text-xs text-center mt-14">Loading GIFs…</p>
            ) : gifs.length === 0 ? (
              <p className="text-tg-text-hint text-xs text-center mt-14">No saved GIFs yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {gifs.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { onSelectSticker?.(g); onClose(); }}
                    className="aspect-square rounded-xl bg-tg-surface overflow-hidden flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <GifThumb item={g} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {mode === 'emoji' && (
          <div className="space-y-2">
            <div className="flex border-b border-tg-border pb-1 overflow-x-auto scrollbar-hide">
              {CATEGORIES.map((cat, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => document.getElementById(`emoji-cat-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
                  className="flex-shrink-0 w-9 h-8 flex items-center justify-center text-base rounded-lg active:bg-tg-surface"
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {CATEGORIES.map((cat, i) => (
              <div key={i} id={`emoji-cat-${i}`} className="grid grid-cols-8 gap-0.5">
                {cat.emojis
                  .filter((e) => !search.trim() || e.includes(search.trim()))
                  .map((e, idx) => (
                    <button
                      key={`${i}-${idx}`}
                      type="button"
                      onClick={() => onSelect(e)}
                      className="w-9 h-9 flex items-center justify-center text-xl rounded-lg active:bg-tg-surface hover:bg-tg-surface transition-colors"
                    >
                      {e}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Floating Pill Switcher: GIFs | Stickers | Emoji + Close */}
      <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto bg-tg-bg-secondary/95 backdrop-blur-xl border border-tg-border rounded-full p-1 flex items-center gap-0.5">
          {([
            { id: 'gifs', label: 'GIFs' },
            { id: 'stickers', label: 'Stickers' },
            { id: 'emoji', label: 'Emoji' },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={clsx(
                'px-3.5 py-1 rounded-full text-xs transition-colors',
                mode === t.id
                  ? 'bg-tg-surface text-tg-text font-semibold'
                  : 'text-tg-text-secondary font-medium'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto absolute right-0 w-8 h-8 rounded-full bg-tg-bg-secondary/95 border border-tg-border flex items-center justify-center text-tg-text-secondary active:scale-95"
          aria-label="Close sticker tray"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}