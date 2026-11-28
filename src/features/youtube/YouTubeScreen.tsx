'use client';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useYouTubeStore, type YouTubeVideo } from '@/store/youtube.store';
import { useDialogsStore } from '@/store/dialogs.store';
import {
  extractYouTubeId,
  fetchYouTubeMetadata,
  searchYouTubeVideos,
  fetchDynamicCategoryVideos,
  fetchCategoryVideosPage,
} from '@/services/youtube.service';
import { unlockAndStartBackgroundAudio } from '@/services/youtubeBackgroundAudio.service';

import { YouTubeHeader } from './components/YouTubeHeader';
import { CategoryTabs, type CategoryFilter } from './components/CategoryTabs';
import { YouTubeFeedView } from './components/YouTubeFeedView';
import { YouTubeChannelView } from './components/YouTubeChannelView';
import { YouTubePlayerView } from './components/YouTubePlayerView';

export default function YouTubeScreen() {
  const router = useRouter();
  const {
    currentVideo,
    playerMode,
    playVideo,
    closePlayer,
    favorites,
    toggleFavorite,
    isFavorite,
  } = useYouTubeStore();

  const dialogs = useDialogsStore((s) => s.dialogs);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [liveResults, setLiveResults] = useState<YouTubeVideo[] | null>(null);

  // Determine current active view (declared before effects to avoid TDZ ReferenceError)
  const isWatchView = Boolean(currentVideo && playerMode !== 'closed' && liveResults === null);

  // Feed state
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [categoryVideos, setCategoryVideos] = useState<YouTubeVideo[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedPage, setFeedPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Channel state
  const [selectedChannel, setSelectedChannel] = useState<{
    name: string;
    avatar?: string;
    id?: string;
    url?: string;
  } | null>(null);
  const [channelVideos, setChannelVideos] = useState<YouTubeVideo[]>([]);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);

  // Scroll and Player Refs
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

  // Guarantee that entering watch mode resets scroll directly to top
  useEffect(() => {
    if (isWatchView) {
      scrollToTop();
      const t1 = setTimeout(scrollToTop, 50);
      const t2 = setTimeout(scrollToTop, 150);
      const t3 = setTimeout(scrollToTop, 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [currentVideo?.id, isWatchView, scrollToTop]);

  // ── Video Play Handler ──
  const handlePlayVideo = useCallback(
    (video: YouTubeVideo) => {
      unlockAndStartBackgroundAudio(video);
      setSelectedChannel(null);
      setIsSearchOpen(false);
      playVideo(video, 'pip');
      scrollToTop();
      try {
        window.history.pushState({ view: 'watch', videoId: video.id }, '');
      } catch {}
    },
    [playVideo, scrollToTop]
  );

  // ── Channel Navigation Handler ──
  const openChannel = useCallback(
    async (channel: {
      name: string;
      avatar?: string;
      id?: string;
      url?: string;
    }) => {
      setSelectedChannel(channel);
      setIsLoadingChannel(true);
      scrollToTop();
      try {
        window.history.pushState({ view: 'channel', name: channel.name }, '');
      } catch {}

      try {
        const vids = await searchYouTubeVideos(channel.name);
        setChannelVideos(vids);
      } catch {
        setChannelVideos([]);
      } finally {
        setIsLoadingChannel(false);
      }
    },
    [scrollToTop]
  );

  // ── Unified, Conflict-Free Navigation Back Handler ──
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
    if (liveResults !== null) {
      setLiveResults(null);
      scrollToTop();
      return;
    }
    // Return to Tools screen smoothly
    router.push('/tools');
  }, [
    isSearchOpen,
    selectedChannel,
    currentVideo,
    playerMode,
    liveResults,
    closePlayer,
    scrollToTop,
    router,
  ]);

  // ── Sync with Device / Browser PopState ──
  useEffect(() => {
    const handlePopState = () => {
      if (isSearchOpen) {
        setIsSearchOpen(false);
      } else if (selectedChannel) {
        setSelectedChannel(null);
      } else if (currentVideo && playerMode !== 'closed') {
        closePlayer();
      } else if (liveResults !== null) {
        setLiveResults(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSearchOpen, selectedChannel, currentVideo, playerMode, liveResults, closePlayer]);

  // ── Category Feed Loader ──
  const loadCategoryFeed = useCallback(async (cat: CategoryFilter, isShuffle: boolean = false) => {
    if (cat === 'favorites') return;
    setIsLoadingFeed(true);
    setFeedPage(0);
    setHasMore(true);
    try {
      const vids = await fetchDynamicCategoryVideos(cat, isShuffle);
      setCategoryVideos(vids);
    } catch {
      // ignore
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    loadCategoryFeed(activeCategory);
  }, [activeCategory, loadCategoryFeed]);

  // ── Infinite Scroll: Load More Videos ──
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isLoadingFeed || activeCategory === 'favorites' || liveResults !== null || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = feedPage + 1;
      const moreVideos = await fetchCategoryVideosPage(activeCategory, nextPage);
      if (moreVideos && moreVideos.length > 0) {
        setCategoryVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const uniqueNew = moreVideos.filter((v) => !existingIds.has(v.id));
          return [...prev, ...uniqueNew];
        });
        setFeedPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isLoadingFeed, activeCategory, liveResults, hasMore, feedPage]);

  // ── Search Submission Handler ──
  const handleSearchSubmit = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      if (!query) return;

      const videoId = extractYouTubeId(query);
      if (videoId) {
        setIsResolving(true);
        try {
          const meta = await fetchYouTubeMetadata(videoId);
          const newVideo: YouTubeVideo = {
            id: videoId,
            title: meta?.title || `YouTube Video (${videoId})`,
            channel: meta?.channel || 'YouTube',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: 'YouTube',
            category: 'trending',
          };
          handlePlayVideo(newVideo);
          setIsSearchOpen(false);
        } catch {
          // ignore
        } finally {
          setIsResolving(false);
        }
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchYouTubeVideos(query);
        setLiveResults(results);
        setIsSearchOpen(false);
        scrollToTop();
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    },
    [handlePlayVideo, scrollToTop]
  );

  // ── Displayed Videos ──
  const displayedVideos = useMemo(() => {
    if (liveResults !== null) return liveResults;
    if (activeCategory === 'favorites') return favorites;
    return categoryVideos;
  }, [liveResults, activeCategory, favorites, categoryVideos]);

  // ── Up Next Recommendations (Watch Mode) ──
  const upNextVideos = useMemo(() => {
    if (!currentVideo) return [];
    return categoryVideos.filter((v) => v.id !== currentVideo.id).slice(0, 10);
  }, [currentVideo, categoryVideos]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={() => {
        if (!scrollContainerRef.current || isLoadingMore || isLoadingFeed || activeCategory === 'favorites' || liveResults !== null || !hasMore) {
          return;
        }
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollHeight - scrollTop - clientHeight < 400) {
          handleLoadMore();
        }
      }}
      className="flex-1 flex flex-col h-full bg-tg-bg overflow-y-auto scrollbar-hide pb-28 select-none"
    >
      {/* ── Top Unified Sticky Header ── */}
      <div className="safe-top border-b border-tg-border/20 sticky top-0 bg-tg-bg/95 backdrop-blur-md z-30">
        <YouTubeHeader
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          selectedChannel={selectedChannel}
          onBack={handleBack}
          onSearchSubmit={handleSearchSubmit}
          onShuffle={() => loadCategoryFeed(activeCategory, true)}
          onLogoClick={() => {
            closePlayer();
            setSelectedChannel(null);
            setLiveResults(null);
            setActiveCategory('all');
            scrollToTop();
          }}
          isSearchingOrResolving={isSearching || isResolving}
        />

        {/* ── Category Filter Tabs (Visible only in Home Browse Mode) ── */}
        {!isWatchView && !selectedChannel && !isSearchOpen && (
          <CategoryTabs
            activeCategory={activeCategory}
            onSelectCategory={(cat) => {
              setActiveCategory(cat);
              setLiveResults(null);
              setFeedPage(0);
              setHasMore(true);
            }}
            savedCount={favorites.length}
          />
        )}
      </div>

      {/* ── Main View Router ── */}
      {selectedChannel ? (
        <YouTubeChannelView
          channel={selectedChannel}
          videos={channelVideos}
          isLoading={isLoadingChannel}
          onPlayVideo={handlePlayVideo}
        />
      ) : isWatchView ? (
        <YouTubePlayerView
          currentVideo={currentVideo}
          upNextVideos={upNextVideos}
          isFavorite={isFavorite(currentVideo.id)}
          onToggleFavorite={() => toggleFavorite(currentVideo)}
          onClosePlayer={() => {
            closePlayer();
            scrollToTop();
          }}
          onPlayNextVideo={handlePlayVideo}
          onOpenChannel={openChannel}
          dialogs={dialogs}
          playerContainerRef={playerContainerRef}
        />
      ) : (
        <YouTubeFeedView
          displayedVideos={displayedVideos}
          isLoadingFeed={isLoadingFeed}
          isLoadingMore={isLoadingMore}
          isSearching={isSearching}
          liveResults={liveResults}
          onResetSearch={() => {
            setLiveResults(null);
            setFeedPage(0);
            setHasMore(true);
          }}
          activeCategory={activeCategory}
          currentVideoId={currentVideo?.id}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          onPlayVideo={handlePlayVideo}
          onOpenChannel={openChannel}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      )}
    </div>
  );
}
