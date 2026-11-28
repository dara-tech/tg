'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  X,
  Heart,
  Share2,
  Play,
  RotateCcw,
  Sparkles,
  Tv,
  Film,
  Music,
  Gamepad2,
  Trophy,
  Newspaper,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import {
  type DailymotionVideo,
  type DailymotionCategory,
  DAILYMOTION_CATEGORIES,
  fetchDailymotionVideos,
  searchDailymotionVideos,
} from '@/services/dailymotion.service';
import { useDailymotionStore } from '@/store/dailymotion.store';

export default function DailymotionScreen() {
  const router = useRouter();
  const {
    currentVideo,
    playerMode,
    playVideo,
    closePlayer,
    favorites,
    toggleFavorite,
    isFavorite,
  } = useDailymotionStore();

  const [activeCategory, setActiveCategory] = useState<DailymotionCategory>('all');
  const [videos, setVideos] = useState<DailymotionVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DailymotionVideo[] | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, []);

  // ── Load Feed by Category ──
  const loadCategory = useCallback(async (cat: DailymotionCategory) => {
    if (cat === 'favorites') return;
    setIsLoading(true);
    setPage(1);
    setHasMore(true);
    try {
      const vids = await fetchDailymotionVideos(cat, 1);
      setVideos(vids);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategory(activeCategory);
  }, [activeCategory, loadCategory]);

  // ── Handle Video Click ──
  const handleSelectVideo = useCallback(
    (video: DailymotionVideo) => {
      playVideo(video);
      scrollToTop();
    },
    [playVideo, scrollToTop]
  );

  // ── Handle Back Navigation ──
  const handleBack = useCallback(() => {
    if (isSearchOpen) {
      setIsSearchOpen(false);
      setSearchResults(null);
      setSearchQuery('');
      return;
    }
    if (currentVideo && playerMode !== 'closed') {
      closePlayer();
      scrollToTop();
      return;
    }
    router.push('/tools');
  }, [isSearchOpen, currentVideo, playerMode, closePlayer, scrollToTop, router]);

  // ── Handle Search ──
  const handleSearchSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;

      setIsSearching(true);
      try {
        const results = await searchDailymotionVideos(q, 1);
        setSearchResults(results);
        scrollToTop();
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchQuery, scrollToTop]
  );

  // ── Share Link ──
  const handleShare = useCallback((video: DailymotionVideo) => {
    const url = `https://www.dailymotion.com/video/${video.id}`;
    if (navigator.share) {
      navigator.share({ title: video.title, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
  }, []);

  // ── Displayed Feed List ──
  const displayedVideos = useMemo(() => {
    if (searchResults !== null) return searchResults;
    if (activeCategory === 'favorites') return favorites;
    return videos;
  }, [searchResults, activeCategory, favorites, videos]);

  const upNextVideos = useMemo(() => {
    if (!currentVideo) return [];
    return videos.filter((v) => v.id !== currentVideo.id).slice(0, 10);
  }, [currentVideo, videos]);

  const isWatchView = Boolean(currentVideo && playerMode !== 'closed' && searchResults === null);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-28 select-none"
    >
      {/* ── Top Header ── */}
      <div className="safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-md z-30">
        <div className="flex items-center justify-between px-3.5 h-14">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-full flex items-center justify-center text-tg-text-secondary active:scale-95 transition-all hover:bg-tg-surface"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-tg-text" />
            </button>

            {/* Dailymotion Brand Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 shadow-xs">
                <img
                  src="/icons/dailymotion.svg"
                  alt="Dailymotion"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[17px] font-extrabold tracking-tight text-tg-text">
                dailymotion
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className={clsx(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                isSearchOpen
                  ? 'bg-tg-blue text-white'
                  : 'text-tg-text-secondary hover:bg-tg-surface active:scale-95'
              )}
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Search Bar Input Row ── */}
        {isSearchOpen && (
          <div className="px-3.5 pb-3">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-tg-text-hint pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, drama, news, music…"
                autoFocus
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-tg-surface border border-tg-border/30 text-tg-text text-sm placeholder:text-tg-text-hint/70 focus:outline-none focus:border-tg-blue transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="absolute right-2.5 w-5 h-5 rounded-full bg-tg-text-hint/20 flex items-center justify-center text-tg-text-secondary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </form>
          </div>
        )}

        {/* ── Category Tabs (when not watching a video) ── */}
        {!isWatchView && !isSearchOpen && (
          <div className="flex items-center gap-1.5 px-3.5 py-2 overflow-x-auto scrollbar-hide">
            {DAILYMOTION_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id && searchResults === null;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchResults(null);
                  }}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                    active
                      ? 'bg-tg-text text-tg-bg shadow-sm'
                      : 'bg-tg-surface text-tg-text-secondary border border-tg-border/20 active:scale-95'
                  )}
                >
                  {cat.label}
                  {cat.id === 'favorites' && favorites.length > 0 && ` (${favorites.length})`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── WATCH / PLAYER VIEW ── */}
      {isWatchView && currentVideo ? (
        <div className="flex flex-col">
          {/* Responsive 16:9 Dailymotion Embed Player */}
          <div className="relative w-full aspect-video bg-black sticky top-14 z-20 shadow-md">
            <iframe
              src={`https://www.dailymotion.com/embed/video/${currentVideo.id}?autoplay=1&mute=0&ui-logo=0&ui-start-screen-info=0`}
              title={currentVideo.title}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Video Metadata & Controls */}
          <div className="p-4 border-b border-tg-border/20">
            <h1 className="text-base font-bold text-tg-text line-clamp-2 leading-snug">
              {currentVideo.title}
            </h1>
            <div className="flex items-center justify-between mt-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-tg-text truncate">
                  {currentVideo.channel}
                </p>
                <p className="text-[11px] text-tg-text-hint mt-0.5">
                  {currentVideo.views} • {currentVideo.duration}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(currentVideo)}
                  className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-90',
                    isFavorite(currentVideo.id)
                      ? 'bg-rose-500/15 border-rose-500 text-rose-500'
                      : 'bg-tg-surface border-tg-border/30 text-tg-text-secondary'
                  )}
                  aria-label="Favorite"
                >
                  <Heart
                    className={clsx(
                      'w-4 h-4',
                      isFavorite(currentVideo.id) && 'fill-current'
                    )}
                  />
                </button>

                <button
                  onClick={() => handleShare(currentVideo)}
                  className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/30 flex items-center justify-center text-tg-text-secondary active:scale-90 transition-all"
                  aria-label="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Up Next List */}
          <div className="p-3.5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tg-text-secondary">
              Up Next
            </h3>
            <div className="space-y-3">
              {upNextVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleSelectVideo(video)}
                  className="flex gap-3 group cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="relative w-36 aspect-video rounded-xl overflow-hidden bg-tg-surface shrink-0 border border-tg-border/20">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold">
                      {video.duration}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-xs font-bold text-tg-text line-clamp-2 leading-snug group-hover:text-tg-blue transition-colors">
                      {video.title}
                    </h4>
                    <p className="text-[11px] text-tg-text-hint truncate mt-1">
                      {video.channel}
                    </p>
                    <p className="text-[10px] text-tg-text-hint/80 mt-0.5">
                      {video.views}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── FEED & SEARCH RESULTS VIEW ── */
        <div className="p-3.5 space-y-4">
          {isSearching || isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-tg-text-hint">
              <Loader2 className="w-8 h-8 animate-spin text-[#0066dc]" />
              <p className="text-xs font-medium">Loading Dailymotion videos…</p>
            </div>
          ) : displayedVideos.length === 0 ? (
            <div className="py-20 text-center">
              <Film className="w-10 h-10 text-tg-text-hint mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-tg-text">No videos found</p>
              <p className="text-xs text-tg-text-hint mt-1">
                {activeCategory === 'favorites'
                  ? 'Tap the heart icon on any video to save it here.'
                  : 'Try searching with another keyword.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleSelectVideo(video)}
                  className="rounded-2xl overflow-hidden bg-tg-bg-secondary border border-tg-border/25 group cursor-pointer active:scale-[0.99] transition-all hover:border-tg-blue/40 shadow-xs flex flex-col"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video w-full bg-tg-surface overflow-hidden">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* Play Badge Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                    {/* Duration badge */}
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold">
                      {video.duration}
                    </span>
                  </div>

                  {/* Info Row */}
                  <div className="p-3 flex items-start justify-between gap-2.5">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-tg-text line-clamp-2 leading-snug group-hover:text-tg-blue transition-colors">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-tg-text-hint">
                        <span className="font-semibold text-tg-text-secondary truncate">
                          {video.channel}
                        </span>
                        <span>•</span>
                        <span>{video.views}</span>
                      </div>
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(video);
                      }}
                      className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-90 shrink-0',
                        isFavorite(video.id)
                          ? 'bg-rose-500/15 border-rose-500 text-rose-500'
                          : 'bg-tg-surface border-tg-border/30 text-tg-text-secondary hover:text-tg-text'
                      )}
                      aria-label="Save video"
                    >
                      <Heart
                        className={clsx(
                          'w-3.5 h-3.5',
                          isFavorite(video.id) && 'fill-current'
                        )}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
