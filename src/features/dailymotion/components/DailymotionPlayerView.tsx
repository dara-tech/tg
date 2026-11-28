import React, { useState, useEffect, useRef, memo } from 'react';
import {
  ChevronDown,
  X,
  ThumbsUp,
  Share2,
  Heart,
  Check,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { type DailymotionVideo } from '@/services/dailymotion.service';
import { DailymotionPlayerLoadingOverlay } from './DailymotionSkeletons';

interface DailymotionPlayerViewProps {
  currentVideo: DailymotionVideo;
  upNextVideos: DailymotionVideo[];
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClosePlayer: () => void;
  onPlayNextVideo: (video: DailymotionVideo) => void;
  onOpenChannel?: (channel: {
    name: string;
    avatar?: string;
    id?: string;
    cover?: string;
  }) => void;
  playerContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export const DailymotionPlayerView = memo(function DailymotionPlayerView({
  currentVideo,
  upNextVideos,
  isFavorite,
  onToggleFavorite,
  onClosePlayer,
  onPlayNextVideo,
  onOpenChannel,
  playerContainerRef,
}: DailymotionPlayerViewProps) {
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setLiked(false);
    setCopied(false);
    setIsVideoLoading(true);
    setIsMuted(true);
    setAvatarError(false);

    if (playerContainerRef?.current) {
      playerContainerRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
      const parent = playerContainerRef.current.closest('.overflow-y-auto');
      if (parent) parent.scrollTop = 0;
    }
  }, [currentVideo.id, playerContainerRef]);

  const handleShare = () => {
    const url = `https://www.dailymotion.com/video/${currentVideo.id}`;
    if (navigator.share) {
      navigator.share({ title: currentVideo.title, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          command: nextMuted ? 'mute' : 'unmute',
        }),
        '*'
      );
    } catch {}
  };

  return (
    <div ref={playerContainerRef} className="flex flex-col w-full">
      {/* ── Sticky Top Video Player Area ── */}
      <div className="sticky top-0 z-30 bg-black shadow-lg">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-black/80 backdrop-blur-md">
          <button
            onClick={onClosePlayer}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white px-2 py-1 rounded-full bg-white/10 active:scale-95 transition-all"
            aria-label="Minimize or close"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Minimize</span>
          </button>

          <button
            onClick={onClosePlayer}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 16:9 Dailymotion Embed Player */}
        <div className="relative aspect-video w-full bg-black overflow-hidden">
          {isVideoLoading && (
            <DailymotionPlayerLoadingOverlay
              thumbnail={currentVideo.thumbnail}
              title={currentVideo.title}
            />
          )}

          <iframe
            ref={iframeRef}
            key={currentVideo.id}
            src={`https://geo.dailymotion.com/player/x8lr5.html?video=${currentVideo.id}&autoplay=1&mute=1&playsinline=1&controls=1`}
            title={currentVideo.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setIsVideoLoading(false)}
          />

          {/* Sound Toggle Button (Matching YouTube style) */}
          <button
            onClick={handleToggleSound}
            className={`absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold backdrop-blur-md border shadow-2xl active:scale-95 transition-all ${
              isMuted
                ? 'bg-[#0066dc]/90 border-blue-400/30 animate-pulse'
                : 'bg-black/80 border-white/20'
            }`}
            title={isMuted ? 'បើកសំឡេង (Tap for Sound)' : 'បិទសំឡេង (Mute)'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-white" />
                <span>បើកសំឡេង (Sound)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-sky-400" />
                <span>Sound On</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Video Info & Metadata Row ── */}
      <div className="p-4 border-b border-tg-border/20 bg-tg-bg space-y-3">
        <h1 className="text-base font-bold text-tg-text line-clamp-2 leading-snug">
          {currentVideo.title}
        </h1>

        <div className="flex items-center gap-2 text-xs text-tg-text-hint">
          <span>{currentVideo.views}</span>
          <span>•</span>
          <span>{currentVideo.duration}</span>
        </div>

        {/* Channel Details */}
        <div className="flex items-center justify-between pt-1">
          <div
            onClick={() =>
              onOpenChannel &&
              onOpenChannel({
                name: currentVideo.channel,
                avatar: currentVideo.channelAvatar,
                id: currentVideo.channelId,
                cover: currentVideo.channelCover,
              })
            }
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          >
            {currentVideo.channelAvatar && !avatarError ? (
              <img
                src={currentVideo.channelAvatar}
                alt={currentVideo.channel}
                className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-tg-border/30 shadow-xs group-hover:opacity-90 transition-opacity bg-tg-surface"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066dc] to-sky-500 flex items-center justify-center text-white text-sm font-bold uppercase shadow-xs shrink-0 group-hover:ring-2 group-hover:ring-[#0066dc]/40 transition-all">
                {currentVideo.channel.charAt(0) || 'D'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-tg-text truncate group-hover:text-[#0066dc] transition-colors">
                {currentVideo.channel}
              </p>
              <p className="text-[10px] text-tg-text-hint">Dailymotion Creator</p>
            </div>
          </div>

          <button
            onClick={() => onToggleFavorite()}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs active:scale-95 ${
              isFavorite
                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                : 'bg-tg-text text-tg-bg hover:opacity-90'
            }`}
          >
            {isFavorite ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* Action Button Pills */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setLiked((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all active:scale-95 shrink-0 ${
              liked
                ? 'bg-[#0066dc]/15 border-[#0066dc] text-[#0066dc]'
                : 'bg-tg-surface border-tg-border/30 text-tg-text-secondary hover:text-tg-text'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
            <span>{liked ? 'Liked' : 'Like'}</span>
          </button>

          <button
            onClick={handleShare}
            className="px-3.5 py-1.5 rounded-full bg-tg-surface border border-tg-border/30 text-tg-text-secondary hover:text-tg-text text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Link Copied' : 'Share'}</span>
          </button>

          <button
            onClick={onToggleFavorite}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-all shrink-0 ${
              isFavorite
                ? 'bg-rose-500/15 border-rose-500 text-rose-500'
                : 'bg-tg-surface border-tg-border/30 text-tg-text-secondary hover:text-tg-text'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
          </button>

          <a
            href={`https://www.dailymotion.com/video/${currentVideo.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-full bg-tg-surface border border-tg-border/30 text-tg-text-secondary hover:text-tg-text text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Web</span>
          </a>
        </div>
      </div>

      {/* ── UP NEXT RECOMMENDATIONS LIST ── */}
      <div className="p-3.5 space-y-3 bg-tg-bg">
        <h3 className="text-xs font-bold tracking-wider uppercase text-tg-text-secondary px-0.5">
          Up Next
        </h3>
        <div className="space-y-3">
          {upNextVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => onPlayNextVideo(video)}
              className="flex gap-3 group cursor-pointer active:scale-[0.99] transition-transform rounded-xl p-1 hover:bg-tg-surface/40"
            >
              <div className="relative w-36 aspect-video rounded-xl overflow-hidden bg-tg-surface shrink-0 border border-tg-border/20 shadow-xs">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = `https://www.dailymotion.com/thumbnail/video/${video.id}`;
                  }}
                />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-white text-[10px] font-bold shadow-sm">
                  {video.duration}
                </span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-xs font-bold text-tg-text line-clamp-2 leading-snug group-hover:text-[#0066dc] transition-colors">
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
  );
});
