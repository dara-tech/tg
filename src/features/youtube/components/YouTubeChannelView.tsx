import React, { useState, useMemo, memo } from 'react';
import {
  CheckCircle2,
  Bell,
  Check,
  Share2,
  Copy,
  ChevronRight,
  MoreVertical,
  Flame,
  Clock,
  Info,
  Play,
  Film,
} from 'lucide-react';
import { type YouTubeVideo } from '@/store/youtube.store';
import { ChannelSkeleton } from './YouTubeSkeletons';

interface YouTubeChannelViewProps {
  channel: {
    name: string;
    avatar?: string;
    id?: string;
    url?: string;
  };
  videos: YouTubeVideo[];
  isLoading: boolean;
  onPlayVideo: (video: YouTubeVideo) => void;
}

type ChannelTab = 'videos' | 'home' | 'about';
type VideoSort = 'latest' | 'popular';

export const YouTubeChannelView = memo(function YouTubeChannelView({
  channel,
  videos,
  isLoading,
  onPlayVideo,
}: YouTubeChannelViewProps) {
  const [activeTab, setActiveTab] = useState<ChannelTab>('videos');
  const [videoSort, setVideoSort] = useState<VideoSort>('latest');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeMenuVideoId, setActiveMenuVideoId] = useState<string | null>(null);

  const channelHandle = useMemo(() => {
    return `@${channel.name.replace(/\s+/g, '').toLowerCase()}`;
  }, [channel.name]);

  // Sort videos
  const sortedVideos = useMemo(() => {
    if (videoSort === 'popular') {
      return [...videos].sort((a, b) => {
        const viewsA = parseInt((a.views || '0').replace(/[^0-9]/g, ''), 10) || 0;
        const viewsB = parseInt((b.views || '0').replace(/[^0-9]/g, ''), 10) || 0;
        return viewsB - viewsA;
      });
    }
    return videos;
  }, [videos, videoSort]);

  const handleCopyChannelUrl = () => {
    const url = channel.url
      ? `https://www.youtube.com${channel.url}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(channel.name)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyVideoUrl = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${videoId}`);
    setActiveMenuVideoId(null);
  };

  const coverImage = useMemo(() => {
    if (videos.length > 0 && videos[0].thumbnail) {
      return videos[0].thumbnail;
    }
    return channel.avatar || null;
  }, [videos, channel.avatar]);

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pb-10">
      {/* ── Channel Banner / Cover (Cinematic YouTube Panoramic Ratio) ── */}
      <div className="relative aspect-[16/6] sm:aspect-[16/5] w-full bg-zinc-950 overflow-hidden border-b border-tg-border/20">
        {coverImage ? (
          <>
            <img
              src={coverImage}
              alt={`${channel.name} banner`}
              className="w-full h-full object-cover object-center scale-105 filter brightness-[0.7] contrast-[1.1] blur-[1px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-red-950 via-zinc-900 to-stone-900" />
        )}
      </div>

      {/* ── Channel Header & Profile Section (Authentic Centered Mobile YouTube Layout) ── */}
      <div className="px-4 pt-1 pb-4 space-y-3 border-b border-tg-border/15">
        <div className="flex flex-col items-center text-center -mt-10">
          {/* Centered Circular Avatar (Strict 1:1 Aspect Ratio) */}
          <div className="relative">
            {channel.avatar ? (
              <img
                src={channel.avatar}
                alt={channel.name}
                className="w-20 h-20 min-w-[80px] min-h-[80px] max-w-[80px] max-h-[80px] rounded-full object-cover ring-4 ring-tg-bg shadow-2xl bg-tg-surface"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-20 h-20 min-w-[80px] min-h-[80px] rounded-full bg-gradient-to-tr from-rose-600 via-red-600 to-amber-600 text-white font-bold text-2xl flex items-center justify-center ring-4 ring-tg-bg shadow-2xl">
                {channel.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Channel Name with YouTube Verified Tick */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5 min-w-0 px-2">
            <h1 className="text-[20px] font-bold text-tg-text leading-tight truncate tracking-tight">
              {channel.name}
            </h1>
            <CheckCircle2 className="w-4 h-4 text-tg-text-hint shrink-0" />
          </div>

          {/* Handle & Stats */}
          <p className="text-xs text-tg-text-hint mt-1 font-medium">
            <span>{channelHandle}</span>
            <span className="mx-1.5">•</span>
            <span>{videos.length > 0 ? `${videos.length} videos` : 'Official Channel'}</span>
          </p>

          {/* Description snippet & About trigger */}
          <button
            onClick={() => setActiveTab('about')}
            className="flex items-center justify-center gap-1 text-[11px] text-tg-text-hint mt-1.5 hover:text-tg-text transition-colors max-w-sm"
          >
            <span className="truncate">
              Official YouTube creator • More about this channel
            </span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        {/* ── Channel Action Buttons: Subscribe & Share ── */}
        <div className="flex items-center gap-2 pt-1 max-w-md mx-auto w-full">
          <button
            onClick={() => setIsSubscribed(!isSubscribed)}
            className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 ${
              isSubscribed
                ? 'bg-tg-surface border border-tg-border/40 text-tg-text hover:bg-tg-surface/80'
                : 'bg-tg-text text-tg-bg hover:opacity-90'
            }`}
          >
            {isSubscribed ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Subscribed</span>
                <Bell className="w-3.5 h-3.5 text-tg-text-hint ml-0.5" />
              </>
            ) : (
              <span>Subscribe</span>
            )}
          </button>

          <button
            onClick={handleCopyChannelUrl}
            className="h-[38px] px-4 rounded-full bg-tg-surface border border-tg-border/30 text-tg-text text-xs font-semibold flex items-center gap-1.5 hover:bg-tg-surface/80 active:scale-95 transition-transform shrink-0"
            title="Share channel"
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

      {/* ── Channel Navigation Tabs (Videos, Featured, About) ── */}
      <div className="px-4 flex items-center gap-6 border-b border-tg-border/15 text-xs font-semibold bg-tg-bg">
        <button
          onClick={() => setActiveTab('videos')}
          className={`py-3 relative transition-colors ${
            activeTab === 'videos'
              ? 'text-tg-text'
              : 'text-tg-text-hint hover:text-tg-text'
          }`}
        >
          <span>Videos</span>
          {activeTab === 'videos' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-tg-text rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('home')}
          className={`py-3 relative transition-colors ${
            activeTab === 'home'
              ? 'text-tg-text'
              : 'text-tg-text-hint hover:text-tg-text'
          }`}
        >
          <span>Featured</span>
          {activeTab === 'home' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-tg-text rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`py-3 relative transition-colors ${
            activeTab === 'about'
              ? 'text-tg-text'
              : 'text-tg-text-hint hover:text-tg-text'
          }`}
        >
          <span>About</span>
          {activeTab === 'about' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-tg-text rounded-full" />
          )}
        </button>
      </div>

      {/* ── TAB 1: Featured / Home Tab (Hero Spotlight + Top Highlights) ── */}
      {activeTab === 'home' ? (
        <div className="p-4 space-y-5">
          {isLoading ? (
            <ChannelSkeleton count={3} />
          ) : sortedVideos.length === 0 ? (
            <div className="py-16 text-center text-tg-text-hint space-y-2">
              <Film className="w-8 h-8 mx-auto text-tg-text-hint/60" />
              <p className="text-sm font-semibold text-tg-text">No featured videos</p>
              <p className="text-xs">This channel doesn't have public videos right now.</p>
            </div>
          ) : (
            <>
              {/* Hero Spotlight Video */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/15 text-red-500 border border-red-500/30 uppercase tracking-wider">
                    ★ Latest Release
                  </span>
                  <span className="text-xs font-bold text-tg-text">Featured Video</span>
                </div>

                <div
                  onClick={() => onPlayVideo(sortedVideos[0])}
                  className="group rounded-2xl border border-tg-border/30 hover:border-tg-border/60 overflow-hidden bg-tg-surface/60 hover:bg-tg-surface/90 cursor-pointer transition-all duration-200 active:scale-[0.99] shadow-md"
                >
                  <div className="relative aspect-video w-full bg-black overflow-hidden">
                    <img
                      src={sortedVideos[0].thumbnail}
                      alt={sortedVideos[0].title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
                      decoding="async"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    {sortedVideos[0].duration && (
                      <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/85 backdrop-blur-md text-white tracking-wide shadow-md">
                        {sortedVideos[0].duration}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-bold text-tg-text line-clamp-2 leading-snug group-hover:text-tg-blue transition-colors">
                      {sortedVideos[0].title}
                    </h3>
                    <p className="text-xs text-tg-text-hint mt-1 font-medium">
                      {sortedVideos[0].views || 'YouTube'} • Verified Stream
                    </p>
                  </div>
                </div>
              </div>

              {/* Popular Highlights Section */}
              {sortedVideos.length > 1 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-tg-text-hint flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>Popular Highlights</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('videos')}
                      className="text-xs text-tg-blue hover:underline font-medium"
                    >
                      View All ({sortedVideos.length})
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {sortedVideos.slice(1, 4).map((vid) => (
                      <div
                        key={vid.id}
                        onClick={() => onPlayVideo(vid)}
                        className="flex gap-3 cursor-pointer group p-2 rounded-2xl hover:bg-tg-surface/75 active:scale-[0.99] transition-all border border-tg-border/15 hover:border-tg-border/30 shadow-sm"
                      >
                        <div className="relative aspect-video w-36 rounded-xl overflow-hidden bg-black shrink-0 border border-tg-border/20 shadow-sm">
                          <img
                            src={vid.thumbnail}
                            alt={vid.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            decoding="async"
                            loading="lazy"
                          />
                          {vid.duration && (
                            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/85 backdrop-blur-md text-white shadow">
                              {vid.duration}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="text-xs font-semibold text-tg-text line-clamp-2 leading-snug group-hover:text-tg-blue transition-colors">
                            {vid.title}
                          </h4>
                          <p className="text-[11px] text-tg-text-hint mt-1 font-medium">
                            {vid.views || 'YouTube'} • Verified Stream
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : activeTab === 'videos' ? (
        /* ── TAB 2: Videos (Full Comprehensive Video Catalog) ── */
        <div className="p-4 space-y-3">
          {/* Sub-filter chips: Latest vs Popular */}
          <div className="flex items-center gap-2 pb-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setVideoSort('latest')}
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${
                videoSort === 'latest'
                  ? 'bg-tg-text text-tg-bg font-semibold'
                  : 'bg-tg-surface text-tg-text border border-tg-border/30 hover:bg-tg-surface/80'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Latest</span>
            </button>

            <button
              onClick={() => setVideoSort('popular')}
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${
                videoSort === 'popular'
                  ? 'bg-tg-text text-tg-bg font-semibold'
                  : 'bg-tg-surface text-tg-text border border-tg-border/30 hover:bg-tg-surface/80'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Popular</span>
            </button>
          </div>

          {isLoading ? (
            <ChannelSkeleton count={4} />
          ) : sortedVideos.length === 0 ? (
            <div className="py-16 text-center text-tg-text-hint space-y-2">
              <Film className="w-8 h-8 mx-auto text-tg-text-hint/60" />
              <p className="text-sm font-semibold text-tg-text">No videos found</p>
              <p className="text-xs">This channel doesn't have public videos right now.</p>
            </div>
          ) : (
            /* ── Authentic YouTube Channel Video Cards ── */
            <div className="space-y-4">
              {sortedVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => onPlayVideo(video)}
                  className="group rounded-2xl border border-tg-border/20 hover:border-tg-border/50 overflow-hidden bg-tg-surface/40 hover:bg-tg-surface/75 cursor-pointer transition-all duration-200 active:scale-[0.99] shadow-sm hover:shadow-md"
                >
                  {/* 16:9 Thumbnail with YouTube duration badge */}
                  <div className="relative aspect-video w-full bg-black overflow-hidden">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
                      decoding="async"
                      loading="lazy"
                    />

                    {/* Subtle Bottom Gradient Shade for Depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                    {video.duration && (
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/85 backdrop-blur-md text-white tracking-wide shadow-md">
                        {video.duration}
                      </span>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="p-3.5 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-semibold text-tg-text line-clamp-2 leading-snug tracking-tight group-hover:text-tg-blue transition-colors">
                        {video.title}
                      </h4>
                      <p className="text-[11px] text-tg-text-hint mt-1 font-medium">
                        {video.views || 'YouTube'} • Verified Stream
                      </p>
                    </div>

                    {/* Context Menu Button */}
                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuVideoId(
                            activeMenuVideoId === video.id ? null : video.id
                          );
                        }}
                        className="p-1.5 text-tg-text-hint hover:text-tg-text rounded-full hover:bg-tg-surface active:scale-90 transition-all"
                        aria-label="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Options */}
                      {activeMenuVideoId === video.id && (
                        <div className="absolute right-0 top-8 z-30 w-36 bg-tg-surface border border-tg-border/40 rounded-xl shadow-xl py-1 text-xs text-tg-text animate-in fade-in duration-150">
                          <button
                            onClick={(e) => handleCopyVideoUrl(video.id, e)}
                            className="w-full px-3 py-2 text-left hover:bg-tg-bg-secondary flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5 text-tg-text-hint" />
                            <span>Copy link</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── TAB 2: About (Authentic YouTube Channel Details) ── */
        <div className="p-4 space-y-4 text-xs text-tg-text">
          {/* Description Section */}
          <div className="p-4 rounded-2xl bg-tg-surface border border-tg-border/30 space-y-2">
            <h3 className="font-bold text-sm text-tg-text flex items-center gap-2">
              <Info className="w-4 h-4 text-tg-blue" />
              <span>Description</span>
            </h3>
            <p className="text-tg-text-hint leading-relaxed">
              Official YouTube channel of {channel.name}. Watch latest music videos,
              full concerts, podcasts, live streams, and official releases.
            </p>
          </div>

          {/* Channel Details Section */}
          <div className="p-4 rounded-2xl bg-tg-surface border border-tg-border/30 space-y-3">
            <h3 className="font-bold text-sm text-tg-text">Channel Details</h3>
            <div className="space-y-2.5 text-tg-text-hint text-[11px]">
              <div className="flex items-center justify-between py-1 border-b border-tg-border/20">
                <span>Handle</span>
                <span className="font-medium text-tg-text">{channelHandle}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-tg-border/20">
                <span>Status</span>
                <span className="font-medium text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified Partner
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-tg-border/20">
                <span>Platform</span>
                <span className="font-medium text-tg-text">YouTube Official</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Total Videos</span>
                <span className="font-medium text-tg-text">{videos.length} videos</span>
              </div>
            </div>
          </div>

          {/* Share Channel Button */}
          <button
            onClick={handleCopyChannelUrl}
            className="w-full py-2.5 rounded-2xl bg-tg-surface border border-tg-border/30 text-tg-text text-xs font-semibold flex items-center justify-center gap-2 hover:bg-tg-surface/80 active:scale-98 transition-all"
          >
            <Share2 className="w-4 h-4 text-tg-blue" />
            <span>Share Channel</span>
          </button>
        </div>
      )}
    </div>
  );
});
