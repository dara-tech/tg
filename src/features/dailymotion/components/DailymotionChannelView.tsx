import React, { useState, useMemo, memo } from 'react';
import {
  CheckCircle2,
  Check,
  Share2,
  ChevronRight,
  Play,
  Film,
  Heart,
  Volume2,
} from 'lucide-react';
import { type DailymotionVideo } from '@/services/dailymotion.service';
import { DailymotionChannelSkeleton } from './DailymotionSkeletons';

interface DailymotionChannelViewProps {
  channel: {
    name: string;
    avatar?: string;
    cover?: string;
    id?: string;
    subscribers?: string;
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
  const [avatarError, setAvatarError] = useState(false);

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
    if (channel.cover) return channel.cover;
    if (videos.length > 0 && videos[0].thumbnail) {
      return videos[0].thumbnail;
    }
    return null;
  }, [channel.cover, videos]);

  const channelAvatar = useMemo(() => {
    if (channel.avatar) return channel.avatar;
    const found = videos.find((v) => v.channelAvatar);
    if (found?.channelAvatar) return found.channelAvatar;
    return null;
  }, [channel.avatar, videos]);

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
            {channelAvatar && !avatarError ? (
              <img
                src={channelAvatar}
                alt={channel.name}
                className="w-20 h-20 min-w-[80px] min-h-[80px] max-w-[80px] max-h-[80px] rounded-full object-cover ring-4 ring-tg-bg shadow-2xl bg-tg-surface"
                onError={() => setAvatarError(true)}
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

          {/* Handle & Video Count / Subscribers */}
          <p className="text-xs text-tg-text-hint mt-1 font-medium">
            <span>{channelHandle}</span>
            <span className="mx-1.5">•</span>
            <span>
              {channel.subscribers ||
                (videos.length > 0 ? `${videos.length} videos` : 'Dailymotion Creator')}
            </span>
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
            onClick={() => setIsFollowed(!isFollowed)}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 ${
              isFollowed
                ? 'bg-tg-surface border border-tg-border/40 text-tg-text'
                : 'bg-[#0066dc] text-white hover:bg-[#0052b3]'
            }`}
          >
            {isFollowed ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#0066dc]" />
                <span>Following</span>
              </>
            ) : (
              <span>Follow</span>
            )}
          </button>

          <button
            onClick={handleShareChannel}
            className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/30 text-tg-text flex items-center justify-center hover:bg-tg-surface/80 active:scale-95 transition-all shadow-sm"
            aria-label="Share Channel"
          >
            {copiedLink ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs: Videos / About ── */}
      <div className="flex border-b border-tg-border/20 px-4 bg-tg-bg/50 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={() => setActiveTab('videos')}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'videos'
              ? 'border-[#0066dc] text-[#0066dc]'
              : 'border-transparent text-tg-text-hint hover:text-tg-text'
          }`}
        >
          Videos
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'about'
              ? 'border-[#0066dc] text-[#0066dc]'
              : 'border-transparent text-tg-text-hint hover:text-tg-text'
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
            <DailymotionChannelSkeleton count={4} />
          ) : sortedVideos.length === 0 ? (
            <div className="py-16 text-center text-tg-text-hint space-y-2">
              <Film className="w-10 h-10 text-tg-text-hint mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-tg-text">រកមិនឃើញវីដេអូសម្រាប់ឆានែលនេះទេ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {sortedVideos.map((video) => {
                const isFav = isFavorite(video.id);

                return (
                  <div
                    key={video.id}
                    className="group rounded-2xl border border-tg-border/25 overflow-hidden bg-tg-surface/60 hover:bg-tg-surface/90 transition-all shadow-xs hover:shadow-md"
                  >
                    <div
                      onClick={() => onPlayVideo(video)}
                      className="relative aspect-video w-full bg-black overflow-hidden cursor-pointer"
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = `https://www.dailymotion.com/thumbnail/video/${video.id}`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-[#0066dc] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/85 text-white shadow-md">
                        {video.duration}
                      </span>
                    </div>

                    <div className="p-3 flex items-start justify-between gap-2">
                      <div
                        onClick={() => onPlayVideo(video)}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <h3 className="text-xs font-semibold text-tg-text line-clamp-2 leading-snug group-hover:text-[#0066dc] transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-[10px] text-tg-text-hint mt-1">{video.views}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(video);
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-90 ${
                          isFav
                            ? 'text-rose-500 bg-rose-500/10'
                            : 'text-tg-text-hint hover:text-tg-text hover:bg-tg-surface'
                        }`}
                        aria-label="Save"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
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
        <div className="p-4 space-y-4">
          <div className="p-4 rounded-2xl bg-tg-surface border border-tg-border/25 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tg-text-secondary">
              Channel Information
            </h3>
            <p className="text-xs text-tg-text leading-relaxed">
              Welcome to the official {channel.name} channel on Dailymotion. Watch high-definition
              dramas, movies, series and music videos directly inside Telegram.
            </p>
            <div className="pt-2 border-t border-tg-border/15 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-tg-border/10">
                <span className="text-tg-text-hint">Creator</span>
                <span className="font-semibold text-tg-text">{channel.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-tg-border/10">
                <span className="text-tg-text-hint">Handle</span>
                <span className="font-semibold text-tg-text">{channelHandle}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-tg-text-hint">Platform</span>
                <span className="font-semibold text-[#0066dc]">Dailymotion Partner</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
