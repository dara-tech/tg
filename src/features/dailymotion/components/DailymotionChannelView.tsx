import React, { useState, useMemo, memo } from 'react';
import {
  CheckCircle2,
  Check,
  Share2,
  ChevronRight,
  Play,
  Film,
  Heart,
  Loader2,
} from 'lucide-react';
import { type DailymotionVideo } from '@/services/dailymotion.service';

interface DailymotionChannelViewProps {
  channel: {
    name: string;
    avatar?: string;
  };
  videos: DailymotionVideo[];
  isLoading: boolean;
  onPlayVideo: (video: DailymotionVideo) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (video: DailymotionVideo) => void;
}

type ChannelTab = 'videos' | 'about';
type VideoSort = 'latest' | 'popular';

export const DailymotionChannelView = memo(function DailymotionChannelView({
  channel,
  videos,
  isLoading,
  onPlayVideo,
  isFavorite,
  onToggleFavorite,
}: DailymotionChannelViewProps) {
  const [activeTab, setActiveTab] = useState<ChannelTab>('videos');
  const [videoSort, setVideoSort] = useState<VideoSort>('latest');
  const [isFollowed, setIsFollowed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const channelHandle = useMemo(() => {
    return `@${channel.name.replace(/\s+/g, '').toLowerCase()}`;
  }, [channel.name]);

  const sortedVideos = useMemo(() => {
    if (videoSort === 'popular') {
      return [...videos].sort((a, b) => {
        const parse = (str: string) => {
          if (!str) return 0;
          if (str.includes('M')) return parseFloat(str) * 1_000_000;
          if (str.includes('K')) return parseFloat(str) * 1_000;
          return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
        };
        return parse(b.views) - parse(a.views);
      });
    }
    return videos;
  }, [videos, videoSort]);

  const handleShareChannel = () => {
    const url = `https://www.dailymotion.com/search/${encodeURIComponent(channel.name)}`;
    if (navigator.share) {
      navigator.share({ title: channel.name, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const coverImage = useMemo(() => {
    if (videos.length > 0 && videos[0].thumbnail) {
      return videos[0].thumbnail;
    }
    return null;
  }, [videos]);

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pb-10">
      {/* ── Channel Panoramic Banner (matching YouTube) ── */}
      <div className="relative aspect-[16/6] sm:aspect-[16/5] w-full bg-zinc-950 overflow-hidden border-b border-tg-border/20">
        {coverImage ? (
          <>
            <img
              src={coverImage}
              alt={`${channel.name} banner`}
              className="w-full h-full object-cover object-center scale-105 filter brightness-[0.6] contrast-[1.1] blur-[1px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-950 via-sky-900 to-indigo-950" />
        )}
      </div>

      {/* ── Channel Header & Profile Section ── */}
      <div className="px-4 pt-1 pb-4 space-y-3 border-b border-tg-border/15">
        <div className="flex flex-col items-center text-center -mt-10">
          {/* Centered Circular Avatar */}
          <div className="relative">
            {channel.avatar ? (
              <img
                src={channel.avatar}
                alt={channel.name}
                className="w-20 h-20 min-w-[80px] min-h-[80px] max-w-[80px] max-h-[80px] rounded-full object-cover ring-4 ring-tg-bg shadow-2xl bg-tg-surface"
              />
            ) : (
              <div className="w-20 h-20 min-w-[80px] min-h-[80px] rounded-full bg-gradient-to-tr from-[#0066dc] to-sky-400 text-white font-bold text-2xl flex items-center justify-center ring-4 ring-tg-bg shadow-2xl">
                {channel.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Channel Name with Verified Tick */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5 min-w-0 px-2">
            <h1 className="text-[20px] font-bold text-tg-text leading-tight truncate tracking-tight">
              {channel.name}
            </h1>
            <CheckCircle2 className="w-4 h-4 text-[#0066dc] shrink-0 fill-[#0066dc]/20" />
          </div>

          {/* Handle & Video Count */}
          <p className="text-xs text-tg-text-hint mt-1 font-medium">
            <span>{channelHandle}</span>
            <span className="mx-1.5">•</span>
            <span>{videos.length > 0 ? `${videos.length} videos` : 'Dailymotion Creator'}</span>
          </p>

          <button
            onClick={() => setActiveTab('about')}
            className="flex items-center justify-center gap-1 text-[11px] text-tg-text-hint mt-1.5 hover:text-tg-text transition-colors max-w-sm"
          >
            <span className="truncate">Official Dailymotion creator • More about this channel</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        {/* Action Buttons: Follow & Share */}
        <div className="flex items-center justify-center gap-2.5 pt-1">
          <button
            onClick={() => setIsFollowed((prev) => !prev)}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all shadow-xs active:scale-95 ${
              isFollowed
                ? 'bg-tg-surface text-tg-text border border-tg-border/40 hover:bg-tg-surface/80'
                : 'bg-[#0066dc] text-white hover:bg-[#0055ba]'
            }`}
          >
            {isFollowed ? 'Following' : 'Follow'}
          </button>

          <button
            onClick={handleShareChannel}
            className="h-8 px-4 rounded-full bg-tg-surface border border-tg-border/30 text-tg-text text-xs font-medium flex items-center gap-1.5 hover:bg-tg-surface/80 active:scale-95 transition-transform"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-tg-text-hint" />
            )}
            <span>{copiedLink ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex items-center gap-6 px-4 border-b border-tg-border/15 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('videos')}
          className={`py-3 relative transition-colors ${
            activeTab === 'videos'
              ? 'text-tg-text border-b-2 border-[#0066dc]'
              : 'text-tg-text-hint hover:text-tg-text'
          }`}
        >
          Videos
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`py-3 relative transition-colors ${
            activeTab === 'about'
              ? 'text-tg-text border-b-2 border-[#0066dc]'
              : 'text-tg-text-hint hover:text-tg-text'
          }`}
        >
          About
        </button>
      </div>

      {/* ── Tab Content: Videos ── */}
      {activeTab === 'videos' && (
        <div className="p-3.5 space-y-3">
          {/* Sort Chips */}
          <div className="flex items-center gap-2 pb-1">
            <button
              onClick={() => setVideoSort('latest')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                videoSort === 'latest'
                  ? 'bg-tg-text text-tg-bg'
                  : 'bg-tg-surface text-tg-text-secondary border border-tg-border/20'
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => setVideoSort('popular')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                videoSort === 'popular'
                  ? 'bg-tg-text text-tg-bg'
                  : 'bg-tg-surface text-tg-text-secondary border border-tg-border/20'
              }`}
            >
              Popular
            </button>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-tg-text-hint">
              <Loader2 className="w-8 h-8 animate-spin text-[#0066dc]" />
              <p className="text-xs font-medium">Loading channel videos…</p>
            </div>
          ) : sortedVideos.length === 0 ? (
            <div className="py-16 text-center text-tg-text-hint space-y-2">
              <Film className="w-10 h-10 text-tg-text-hint mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-tg-text">No videos found for this channel</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {sortedVideos.map((video) => {
                const isFav = isFavorite(video.id);
                return (
                  <div
                    key={video.id}
                    className="group rounded-2xl border transition-all duration-200 overflow-hidden bg-tg-surface/60 hover:bg-tg-surface/90 shadow-xs hover:shadow-md border-tg-border/25 hover:border-tg-border/50"
                  >
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                      {video.duration && (
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/85 backdrop-blur-md text-white tracking-wide shadow-md">
                          {video.duration}
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 flex items-start gap-3">
                      <div
                        onClick={() => onPlayVideo(video)}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <h3 className="text-xs font-semibold text-tg-text line-clamp-2 leading-snug group-hover:text-[#0066dc] transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-[11px] text-tg-text-hint truncate mt-1">
                          {video.views}
                        </p>
                      </div>

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
      )}

      {/* ── Tab Content: About ── */}
      {activeTab === 'about' && (
        <div className="p-4 space-y-4 text-xs text-tg-text-secondary leading-relaxed">
          <div className="p-4 rounded-2xl bg-tg-surface border border-tg-border/20 space-y-2">
            <h4 className="font-bold text-tg-text text-sm">Channel Information</h4>
            <p>
              Creator channel <strong>{channel.name}</strong> on Dailymotion. Discover the latest
              episodes, dramas, music, and highlights from this creator.
            </p>
            <div className="pt-2 text-[11px] text-tg-text-hint">
              Total uploaded videos: <strong>{videos.length}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
