'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  type DailymotionVideo,
  type DailymotionCategory,
  fetchDailymotionVideos,
  searchDailymotionVideos,
} from '@/services/dailymotion.service';
import { useDailymotionStore } from '@/store/dailymotion.store';

import { DailymotionHeader } from './components/DailymotionHeader';
import { DailymotionCategoryTabs } from './components/DailymotionCategoryTabs';
import { DailymotionFeedView } from './components/DailymotionFeedView';
import { DailymotionPlayerView } from './components/DailymotionPlayerView';
import { DailymotionChannelView } from './components/DailymotionChannelView';

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

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DailymotionVideo[] | null>(null);

  // Active view evaluation (placed before effects to avoid TDZ ReferenceError)
  const isWatchView = Boolean(currentVideo && playerMode !== 'closed' && searchResults === null);

  // Feed state
  const [activeCategory, setActiveCategory] = useState<DailymotionCategory>('all');
  const [videos, setVideos] = useState<DailymotionVideo[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);

  // Channel view state
  const [selectedChannel, setSelectedChannel] = useState<{ name: string; avatar?: string } | null>(null);
  const [channelVideos, setChannelVideos] = useState<DailymotionVideo[]>([]);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // ── Bulletproof Instant Scroll to Top ──
  const scrollToTop = useCallback(() => {
    const snap = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    snap();
    requestAnimationFrame(snap);
    setTimeout(snap, 30);
    setTimeout(snap, 100);
  }, []);

  // Snap to top when entering watch mode
  useEffect(() => {
    if (isWatchView) {
      scrollToTop();
      const t1 = setTimeout(scrollToTop, 50);
      const t2 = setTimeout(scrollToTop, 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [currentVideo?.id, isWatchView, scrollToTop]);

  // ── Category Feed Loader ──
  const loadCategory = useCallback(async (cat: DailymotionCategory) => {
    if (cat === 'favorites') return;
    setIsLoadingFeed(true);
    try {
      const vids = await fetchDailymotionVideos(cat, 1);
      setVideos(vids);
    } catch {
      // ignore
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    loadCategory(activeCategory);
  }, [activeCategory, loadCategory]);

  // ── Video Selection / Play Handler ──
  const handlePlayVideo = useCallback(
    (video: DailymotionVideo) => {
      playVideo(video);
      setSelectedChannel(null);
      setIsSearchOpen(false);
      scrollToTop();
      try {
        window.history.pushState({ view: 'watch', videoId: video.id }, '');
      } catch {}
    },
    [playVideo, scrollToTop]
  );

  // ── Back Navigation ──
  const handleBack = useCallback(() => {
    if (isSearchOpen) {
      setIsSearchOpen(false);
      return;
    }
    if (selectedChannel) {
      setSelectedChannel(null);
      scrollToTop();
      return;
    }
    if (currentVideo && playerMode !== 'closed') {
      closePlayer();
      scrollToTop();
      return;
    }
    if (searchResults !== null) {
      setSearchResults(null);
      scrollToTop();
      return;
    }
    router.push('/tools');
  }, [
    isSearchOpen,
    selectedChannel,
    currentVideo,
    playerMode,
    searchResults,
    closePlayer,
    scrollToTop,
    router,
  ]);

  // ── Popstate Listener ──
  useEffect(() => {
    const handlePopState = () => {
      if (isSearchOpen) {
        setIsSearchOpen(false);
      } else if (selectedChannel) {
        setSelectedChannel(null);
      } else if (currentVideo && playerMode !== 'closed') {
        closePlayer();
      } else if (searchResults !== null) {
        setSearchResults(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSearchOpen, selectedChannel, currentVideo, playerMode, searchResults, closePlayer]);

  // ── Search Submission Handler ──
  const handleSearchSubmit = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      if (!query) return;

      setIsSearching(true);
      try {
        const results = await searchDailymotionVideos(query, 1);
        setSearchResults(results);
        setIsSearchOpen(false);
        scrollToTop();
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [scrollToTop]
  );

  // ── Channel Navigation Handler ──
  const handleOpenChannel = useCallback(
    async (channel: { name: string; avatar?: string }) => {
      setSelectedChannel(channel);
      setIsLoadingChannel(true);
      scrollToTop();
      try {
        const vids = await searchDailymotionVideos(channel.name, 1);
        setChannelVideos(vids);
      } catch {
        setChannelVideos([]);
      } finally {
        setIsLoadingChannel(false);
      }
    },
    [scrollToTop]
  );

  // ── Displayed Videos ──
  const displayedVideos = useMemo(() => {
    if (searchResults !== null) return searchResults;
    if (activeCategory === 'favorites') return favorites;
    return videos;
  }, [searchResults, activeCategory, favorites, videos]);

  const upNextVideos = useMemo(() => {
    if (!currentVideo) return [];
    return videos.filter((v) => v.id !== currentVideo.id).slice(0, 10);
  }, [currentVideo, videos]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-28 select-none"
    >
      {/* ── Top Unified Sticky Header ── */}
      <div className="safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-md z-30">
        <DailymotionHeader
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          selectedChannel={selectedChannel}
          onBack={handleBack}
          onSearchSubmit={handleSearchSubmit}
          onShuffle={() => loadCategory(activeCategory)}
          onLogoClick={() => {
            closePlayer();
            setSelectedChannel(null);
            setSearchResults(null);
            setActiveCategory('all');
            scrollToTop();
          }}
          isSearching={isSearching}
        />

        {/* Category Pills (Hidden in watch mode or search active) */}
        {!isWatchView && !selectedChannel && !isSearchOpen && (
          <DailymotionCategoryTabs
            activeCategory={activeCategory}
            onSelectCategory={(cat) => {
              setActiveCategory(cat);
              setSearchResults(null);
            }}
            savedCount={favorites.length}
          />
        )}
      </div>

      {/* ── Main View: Watch Mode OR Channel View OR Feed Mode ── */}
      {isWatchView && currentVideo ? (
        <DailymotionPlayerView
          currentVideo={currentVideo}
          upNextVideos={upNextVideos}
          isFavorite={isFavorite(currentVideo.id)}
          onToggleFavorite={() => toggleFavorite(currentVideo)}
          onClosePlayer={() => {
            closePlayer();
            scrollToTop();
          }}
          onPlayNextVideo={handlePlayVideo}
          playerContainerRef={playerContainerRef}
        />
      ) : selectedChannel ? (
        <DailymotionChannelView
          channel={selectedChannel}
          videos={channelVideos}
          isLoading={isLoadingChannel}
          onPlayVideo={handlePlayVideo}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
        />
      ) : (
        <DailymotionFeedView
          displayedVideos={displayedVideos}
          isLoadingFeed={isLoadingFeed}
          isSearching={isSearching}
          searchResults={searchResults}
          onResetSearch={() => setSearchResults(null)}
          activeCategory={activeCategory}
          currentVideoId={currentVideo?.id}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          onPlayVideo={handlePlayVideo}
          onOpenChannel={handleOpenChannel}
        />
      )}
    </div>
  );
}
