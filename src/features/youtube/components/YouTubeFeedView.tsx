import React, { memo, useEffect, useRef } from 'react';
import { Play, Heart, Loader2 } from 'lucide-react';
import { type YouTubeVideo } from '@/store/youtube.store';
import { FeedSkeleton } from './YouTubeSkeletons';

interface YouTubeFeedViewProps {
  displayedVideos: YouTubeVideo[];
  isLoadingFeed: boolean;
  isLoadingMore?: boolean;
  isSearching: boolean;
  liveResults: YouTubeVideo[] | null;
  onResetSearch: () => void;
  activeCategory: string;
  currentVideoId?: string;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (video: YouTubeVideo) => void;
  onPlayVideo: (video: YouTubeVideo) => void;
  onOpenChannel: (channel: {
    name: string;
    avatar?: string;
    id?: string;
    url?: string;
  }) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const YouTubeFeedView = memo(function YouTubeFeedView({
  displayedVideos,
  isLoadingFeed,
  isLoadingMore = false,
  isSearching,
  liveResults,
  onResetSearch,
  activeCategory,
  currentVideoId,
  isFavorite,
  onToggleFavorite,
  onPlayVideo,
  onOpenChannel,
  onLoadMore,
  hasMore = true,
}: YouTubeFeedViewProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for seamless infinite scrolling
  useEffect(() => {
    if (!sentinelRef.current || !onLoadMore || !hasMore || isLoadingMore || isLoadingFeed) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !isLoadingFeed && hasMore) {
          onLoadMore();
        }
      },
      {
        rootMargin: '300px',
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoadingMore, isLoadingFeed]);

  return (
    <div className="px-3.5 py-2.5 max-w-2xl mx-auto w-full">
      {/* Live Search Indicator */}
      {liveResults !== null && (
        <div className="flex items-center justify-between pb-3 px-0.5">
          <span className="text-xs text-tg-text-hint font-medium">
            Found <strong>{liveResults.length} videos</strong>
          </span>
          <button
            onClick={onResetSearch}
            className="text-xs text-red-500 font-semibold hover:underline"
          >
            Reset Search
          </button>
        </div>
      )}

      {isSearching || isLoadingFeed ? (
        <FeedSkeleton
          count={6}
          label={
            isSearching
              ? 'កំពុងស្វែងរកវីដេអូ YouTube...'
              : 'កំពុងផ្ទុកវីដេអូពេញនិយម...'
          }
        />
      ) : displayedVideos.length === 0 ? (
        <div className="py-16 text-center text-tg-text-hint space-y-2">
          <p className="text-sm font-semibold text-tg-text">No videos found</p>
          <p className="text-xs max-w-xs mx-auto">
            {activeCategory === 'favorites'
              ? 'Save your favorite videos by tapping the heart icon.'
              : 'Try searching for any song, artist or video above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {displayedVideos.map((video) => {
            const isFav = isFavorite(video.id);
            const isCurrent = currentVideoId === video.id;

            return (
              <div
                key={video.id}
                className={`group rounded-2xl border transition-all duration-200 overflow-hidden bg-tg-surface/60 hover:bg-tg-surface/90 shadow-xs hover:shadow-md ${
                  isCurrent
                    ? 'border-red-500 ring-1 ring-red-500/40 shadow-md'
                    : 'border-tg-border/25 hover:border-tg-border/50'
                }`}
              >
                {/* 16:9 Thumbnail Container */}
                <div
                  onClick={() => onPlayVideo(video)}
                  className="relative aspect-video w-full bg-black overflow-hidden cursor-pointer"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
                    decoding="async"
                    loading="lazy"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      // Catch YouTube's 120x90 gray placeholder for dead thumbnails
                      if (img.naturalWidth === 120 && img.naturalHeight === 90) {
                        img.src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
                      }
                    }}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('mqdefault.jpg')) {
                        target.src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
                      } else {
                        target.src = `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80`;
                      }
                    }}
                  />

                  {/* Subtle Bottom Gradient Shade for Depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                  {/* YouTube Crisp Duration Badge */}
                  {video.duration && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/85 backdrop-blur-md text-white tracking-wide shadow-md">
                      {video.duration}
                    </span>
                  )}
                </div>

                {/* Video Info Row (Symmetrical Padding & Alignment) */}
                <div className="p-3.5 flex items-start gap-3">
                  {/* Real Dynamic Channel Avatar */}
                  <div
                    onClick={() =>
                      onOpenChannel({
                        name: video.channel,
                        avatar: video.channelAvatar,
                        id: video.channelId,
                        url: video.channelUrl,
                      })
                    }
                    className="cursor-pointer shrink-0 mt-0.5"
                    title={`View ${video.channel}`}
                  >
                    {video.channelAvatar ? (
                      <img
                        src={video.channelAvatar}
                        alt={video.channel}
                        className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full object-cover ring-1 ring-tg-border/30 hover:ring-red-500/60 transition-all shadow-xs bg-tg-surface"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {video.channel.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div
                    onClick={() => onPlayVideo(video)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <h3 className="text-[13.5px] font-semibold text-tg-text line-clamp-2 leading-snug tracking-tight group-hover:text-red-500 transition-colors">
                      {video.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-[11px] text-tg-text-hint mt-1 font-medium">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChannel({
                            name: video.channel,
                            avatar: video.channelAvatar,
                            id: video.channelId,
                            url: video.channelUrl,
                          });
                        }}
                        className="truncate hover:text-tg-text transition-colors"
                      >
                        {video.channel}
                      </span>
                      {video.views && (
                        <>
                          <span className="shrink-0 opacity-40">•</span>
                          <span className="shrink-0">{video.views}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Favorite / Save Toggle */}
                  <button
                    onClick={() => onToggleFavorite(video)}
                    className="p-1.5 rounded-full hover:bg-tg-surface active:scale-90 transition-all text-tg-text-hint hover:text-rose-500 shrink-0"
                    aria-label="Save video"
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        isFav ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Sentinel & Loader */}
      {displayedVideos.length > 0 && hasMore && (
        <div ref={sentinelRef} className="py-6 flex items-center justify-center">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-xs text-tg-text-hint bg-tg-surface/60 px-4 py-2 rounded-full border border-tg-border/20 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
              <span>កំពុងផ្ទុកវីដេអូបន្ថែម...</span>
            </div>
          ) : (
            <div className="h-6" />
          )}
        </div>
      )}
    </div>
  );
});
