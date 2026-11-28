import React, { memo, useState } from 'react';
import { Heart, Film } from 'lucide-react';
import { type DailymotionVideo } from '@/services/dailymotion.service';
import { DailymotionFeedSkeleton } from './DailymotionSkeletons';

interface DailymotionFeedViewProps {
  displayedVideos: DailymotionVideo[];
  isLoadingFeed: boolean;
  isSearching: boolean;
  searchResults: DailymotionVideo[] | null;
  onResetSearch: () => void;
  activeCategory: string;
  currentVideoId?: string;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (video: DailymotionVideo) => void;
  onPlayVideo: (video: DailymotionVideo) => void;
  onOpenChannel?: (channel: {
    name: string;
    avatar?: string;
    id?: string;
    cover?: string;
  }) => void;
}

export const DailymotionFeedView = memo(function DailymotionFeedView({
  displayedVideos,
  isLoadingFeed,
  isSearching,
  searchResults,
  onResetSearch,
  activeCategory,
  currentVideoId,
  isFavorite,
  onToggleFavorite,
  onPlayVideo,
  onOpenChannel,
}: DailymotionFeedViewProps) {
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  return (
    <div className="px-3.5 py-2.5 max-w-2xl mx-auto w-full">
      {/* Live Search Indicator */}
      {searchResults !== null && (
        <div className="flex items-center justify-between pb-3 px-0.5">
          <span className="text-xs text-tg-text-hint font-medium">
            Found <strong>{searchResults.length} videos</strong>
          </span>
          <button
            onClick={onResetSearch}
            className="text-xs text-[#0066dc] font-semibold hover:underline"
          >
            Reset Search
          </button>
        </div>
      )}

      {isSearching || isLoadingFeed ? (
        <DailymotionFeedSkeleton
          count={6}
          label={isSearching ? 'កំពុងស្វែងរក Dailymotion…' : 'កំពុងផ្ទុកវីដេអូពេញនិយម…'}
        />
      ) : displayedVideos.length === 0 ? (
        <div className="py-16 text-center text-tg-text-hint space-y-2">
          <Film className="w-10 h-10 text-tg-text-hint mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-tg-text">រកមិនឃើញវីដេអូ</p>
          <p className="text-xs max-w-xs mx-auto">
            {activeCategory === 'favorites'
              ? 'Save your favorite videos by tapping the heart icon.'
              : 'Try searching for any drama, movie or music above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {displayedVideos.map((video) => {
            const isFav = isFavorite(video.id);
            const isCurrent = currentVideoId === video.id;
            const hasAvatar = Boolean(video.channelAvatar && !failedAvatars[video.id]);

            return (
              <div
                key={video.id}
                className={`group rounded-2xl border transition-all duration-200 overflow-hidden bg-tg-surface/60 hover:bg-tg-surface/90 shadow-xs hover:shadow-md ${
                  isCurrent
                    ? 'border-[#0066dc] ring-1 ring-[#0066dc]/40 shadow-md'
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
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = `https://www.dailymotion.com/thumbnail/video/${video.id}`;
                    }}
                  />

                  {/* Subtle Bottom Gradient Shade for Depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                  {/* Crisp Duration Badge */}
                  {video.duration && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/85 backdrop-blur-md text-white tracking-wide shadow-md">
                      {video.duration}
                    </span>
                  )}
                </div>

                {/* Video Info Row (Symmetrical Padding & Alignment matching YouTube) */}
                <div className="p-3.5 flex items-start gap-3">
                  {/* Channel Avatar */}
                  <div
                    onClick={() =>
                      onOpenChannel &&
                      onOpenChannel({
                        name: video.channel,
                        avatar: video.channelAvatar,
                        id: video.channelId,
                        cover: video.channelCover,
                      })
                    }
                    className="cursor-pointer shrink-0 mt-0.5"
                    title={`View ${video.channel}`}
                  >
                    {hasAvatar ? (
                      <img
                        src={video.channelAvatar}
                        alt={video.channel}
                        className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full object-cover ring-1 ring-tg-border/30 hover:ring-[#0066dc]/60 transition-all shadow-xs bg-tg-surface"
                        onError={() => {
                          setFailedAvatars((prev) => ({ ...prev, [video.id]: true }));
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-gradient-to-br from-[#0066dc] to-sky-500 flex items-center justify-center text-white text-xs font-bold uppercase ring-1 ring-tg-border/30 hover:ring-[#0066dc]/60 transition-all shadow-xs">
                        {video.channel.charAt(0) || 'D'}
                      </div>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div
                    onClick={() => onPlayVideo(video)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <h3 className="text-xs font-semibold text-tg-text line-clamp-2 leading-snug group-hover:text-[#0066dc] transition-colors">
                      {video.title}
                    </h3>
                    <div className="text-[11px] text-tg-text-hint truncate mt-1 flex items-center gap-1.5">
                      <span className="hover:text-tg-text transition-colors">
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
                      onToggleFavorite(video);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-90 ${
                      isFav
                        ? 'text-rose-500 bg-rose-500/10'
                        : 'text-tg-text-hint hover:text-tg-text hover:bg-tg-surface'
                    }`}
                    aria-label="Save video"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
