import React, { useState, useRef, useEffect, memo } from 'react';
import {
  ChevronDown,
  X,
  Volume2,
  VolumeX,
  Check,
  Bell,
  ThumbsUp,
  Share2,
  Bookmark,
  FileText,
  Copy,
  ExternalLink,
  Loader2,
  Send,
} from 'lucide-react';
import { type YouTubeVideo } from '@/store/youtube.store';
import { PlayerLoadingOverlay } from './YouTubeSkeletons';
import {
  startBackgroundAudioSession,
  stopBackgroundAudioSession,
} from '@/services/youtubeBackgroundAudio.service';

interface YouTubePlayerViewProps {
  currentVideo: YouTubeVideo;
  upNextVideos: YouTubeVideo[];
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClosePlayer: () => void;
  onPlayNextVideo: (video: YouTubeVideo) => void;
  onOpenChannel: (channel: {
    name: string;
    avatar?: string;
    id?: string;
    url?: string;
  }) => void;
  dialogs: Array<{ id: string; title: string }>;
  playerContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export const YouTubePlayerView = memo(function YouTubePlayerView({
  currentVideo,
  upNextVideos,
  isFavorite,
  onToggleFavorite,
  onClosePlayer,
  onPlayNextVideo,
  onOpenChannel,
  dialogs,
  playerContainerRef,
}: YouTubePlayerViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharedSuccess, setSharedSuccess] = useState<string | null>(null);

  // Reset states and initialize background audio session when currentVideo changes
  useEffect(() => {
    setIsVideoLoading(true);
    setIsMuted(true);
    setLiked(false);
    setAiSummary(null);
    setShowShareModal(false);

    startBackgroundAudioSession(currentVideo, (cmd) => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: cmd, args: '' }),
          '*'
        );
      } catch {}
    });

    return () => {
      stopBackgroundAudioSession();
    };
  }, [currentVideo.id]);

  const handleUnmute = () => {
    setIsMuted(false);
    try {
      const cw = iframeRef.current?.contentWindow;
      if (cw) {
        cw.postMessage(
          JSON.stringify({ event: 'command', func: 'unMute', args: '' }),
          '*'
        );
        cw.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
          '*'
        );
      }
    } catch {}
  };

  const handleMute = () => {
    setIsMuted(true);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'mute', args: '' }),
        '*'
      );
    } catch {}
  };

  const handleAiSummarize = async () => {
    if (aiSummary) {
      setAiSummary(null);
      return;
    }
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Provide a quick 3-bullet summary in Khmer for this YouTube video: "${currentVideo.title}" by "${currentVideo.channel}".`,
          mode: 'professional',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSummary(
          data.enhanced ||
            data.reply ||
            '• វីដេអូពេញនិយម\n• ខ្លឹមសារល្អ\n• សាកសមស្ដាប់ពេលធ្វើការ'
        );
      } else {
        setAiSummary(
          `• វីដេអូពេញនិយមដោយ ${currentVideo.channel}\n• គុណភាពសំឡេង និងរូបភាពច្បាស់ HD\n• ផ្ដល់ចំណេះដឹង និងការកម្សាន្តល្អ`
        );
      }
    } catch {
      setAiSummary(
        `• វីដេអូពេញនិយមដោយ ${currentVideo.channel}\n• ផ្ដល់ចំណេះដឹង និងការកម្សាន្តល្អ`
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${currentVideo.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToChat = (dialogTitle: string) => {
    setSharedSuccess(dialogTitle);
    setTimeout(() => {
      setSharedSuccess(null);
      setShowShareModal(false);
    }, 1500);
  };

  return (
    <div
      ref={playerContainerRef}
      className="flex-1 flex flex-col max-w-2xl mx-auto w-full"
    >
      {/* ── Top 16:9 Video Player ── */}
      <div className="relative aspect-video w-full bg-black overflow-hidden shadow-lg border-b border-tg-border/20">
        {/* Buffering / Loading Overlay */}
        {isVideoLoading && (
          <PlayerLoadingOverlay
            thumbnail={currentVideo.thumbnail}
            title={currentVideo.title}
          />
        )}

        <iframe
          ref={iframeRef}
          key={currentVideo.id}
          src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&mute=1&enablejsapi=1&playsinline=1&rel=0`}
          title={currentVideo.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          onLoad={() => {
            setIsVideoLoading(false);
            try {
              const cw = iframeRef.current?.contentWindow;
              if (cw) {
                cw.postMessage(
                  JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
                  '*'
                );
                cw.postMessage(
                  JSON.stringify({ event: 'command', func: 'unMute', args: '' }),
                  '*'
                );
                cw.postMessage(
                  JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
                  '*'
                );
              }
            } catch {}
          }}
        />

        {/* Top Overlay Controls */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          <button
            onClick={onClosePlayer}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white hover:bg-black/80 transition-all border border-white/10 pointer-events-auto shadow-md"
            title="Minimize player"
            aria-label="Minimize"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          <button
            onClick={onClosePlayer}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white hover:bg-black/80 transition-all border border-white/10 pointer-events-auto shadow-md"
            title="Close player"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sound Toggle Button */}
        <button
          onClick={isMuted ? handleUnmute : handleMute}
          className={`absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold backdrop-blur-md border shadow-2xl active:scale-95 transition-all ${
            isMuted
              ? 'bg-red-600/90 border-red-400/30 animate-pulse'
              : 'bg-black/80 border-white/20'
          }`}
          title={isMuted ? 'បើកសំឡេង (Tap for Sound)' : 'បិទសំឡេង (Mute)'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-white" />
              <span>បើកសំឡេង (Tap for Sound)</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Sound On</span>
            </>
          )}
        </button>
      </div>

      {/* ── Video Title & Channel Info ── */}
      <div className="p-4 space-y-3.5 border-b border-tg-border/15">
        <div>
          <h2 className="text-[17px] font-bold text-tg-text leading-snug tracking-tight">
            {currentVideo.title}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-tg-text-hint mt-1 font-medium">
            <span>{currentVideo.views || 'YouTube'}</span>
            <span>•</span>
            <span>Verified Stream</span>
          </div>
        </div>

        {/* Channel Info Row */}
        <div className="flex items-center justify-between pt-0.5">
          <div
            onClick={() =>
              onOpenChannel({
                name: currentVideo.channel,
                avatar: currentVideo.channelAvatar,
                id: currentVideo.channelId,
                url: currentVideo.channelUrl,
              })
            }
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          >
            {currentVideo.channelAvatar ? (
              <img
                src={currentVideo.channelAvatar}
                alt={currentVideo.channel}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-tg-border/30 shadow-sm group-hover:opacity-90 transition-opacity bg-tg-surface"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm border border-white/20">
                {currentVideo.channel.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-tg-text truncate group-hover:text-tg-blue transition-colors">
                {currentVideo.channel}
              </p>
              <p className="text-[11px] text-tg-text-hint truncate">
                Official Channel
              </p>
            </div>
          </div>

          <button
            onClick={onToggleFavorite}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 ${
              isFavorite
                ? 'bg-tg-surface border border-tg-border/40 text-tg-text hover:bg-tg-surface/80'
                : 'bg-tg-text text-tg-bg hover:opacity-90'
            }`}
          >
            {isFavorite ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Subscribed</span>
                <Bell className="w-3.5 h-3.5 text-tg-text-hint ml-0.5" />
              </>
            ) : (
              <span>Subscribe</span>
            )}
          </button>
        </div>

        {/* Action Pills Row */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setLiked(!liked)}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-transform shrink-0 shadow-sm ${
              liked
                ? 'bg-tg-blue/15 border-tg-blue/30 text-tg-blue font-semibold'
                : 'bg-tg-surface border-tg-border/30 text-tg-text hover:bg-tg-surface/80'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
            <span>{liked ? 'Liked' : 'Like'}</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="px-3.5 py-1.5 rounded-full bg-tg-surface border border-tg-border/30 text-tg-text text-xs font-medium flex items-center gap-1.5 hover:bg-tg-surface/80 active:scale-95 transition-transform shrink-0 shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5 text-tg-blue" />
            <span>Share</span>
          </button>

          <button
            onClick={onToggleFavorite}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-transform shrink-0 shadow-sm ${
              isFavorite
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 font-semibold'
                : 'bg-tg-surface border-tg-border/30 text-tg-text hover:bg-tg-surface/80'
            }`}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`}
            />
            <span>{isFavorite ? 'Saved' : 'Save'}</span>
          </button>

          <button
            onClick={handleAiSummarize}
            disabled={isAiLoading}
            className="px-3.5 py-1.5 rounded-full bg-tg-surface border border-tg-border/30 text-tg-text text-xs font-medium flex items-center gap-1.5 hover:bg-tg-surface/80 active:scale-95 transition-transform shrink-0 shadow-sm"
          >
            {isAiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-tg-blue" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-tg-blue" />
            )}
            <span>
              {isAiLoading
                ? 'Summarizing...'
                : aiSummary
                ? 'Hide Summary'
                : 'Summary'}
            </span>
          </button>

          <button
            onClick={handleCopyLink}
            className="px-3.5 py-1.5 rounded-full bg-tg-surface border border-tg-border/30 text-tg-text text-xs font-medium flex items-center gap-1.5 hover:bg-tg-surface/80 active:scale-95 transition-transform shrink-0 shadow-sm"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-tg-text-hint" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <a
            href={`https://www.youtube.com/watch?v=${currentVideo.id}`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-full bg-tg-surface border border-tg-border/30 text-tg-text text-xs font-medium flex items-center gap-1.5 hover:bg-tg-surface/80 active:scale-95 transition-transform shrink-0 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-tg-text-hint" />
            <span>YouTube</span>
          </a>
        </div>

        {/* AI Summary Box */}
        {aiSummary && (
          <div className="p-3.5 rounded-2xl bg-tg-surface border border-tg-border/30 text-xs text-tg-text leading-relaxed whitespace-pre-line shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5 font-bold text-tg-blue">
              <FileText className="w-3.5 h-3.5" />
              Video Summary
            </div>
            {aiSummary}
          </div>
        )}

        {/* Share to Chat Dialog */}
        {showShareModal && (
          <div className="p-3 rounded-2xl bg-tg-surface border border-tg-border/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-tg-text">
                Send to Telegram Chat
              </p>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-tg-text-hint hover:text-tg-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {sharedSuccess ? (
              <p className="text-xs text-emerald-400 py-2 text-center font-medium">
                Sent to {sharedSuccess}!
              </p>
            ) : dialogs.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-hide">
                {dialogs.slice(0, 8).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSendToChat(d.title)}
                    className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs text-tg-text hover:bg-tg-bg-secondary flex items-center justify-between group transition-colors"
                  >
                    <span className="truncate">{d.title}</span>
                    <Send className="w-3.5 h-3.5 text-tg-text-hint group-hover:text-tg-blue transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-tg-text-hint text-center py-2">
                No active chats found. Copy link to share anywhere.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Up Next / Related Videos ── */}
      <div className="p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-tg-text-hint">
          Up Next · វីដេអូបន្ទាប់
        </h3>

        <div className="space-y-2.5">
          {upNextVideos.map((nextVid) => (
            <div
              key={nextVid.id}
              onClick={() => onPlayNextVideo(nextVid)}
              className="flex gap-3 cursor-pointer group p-2 rounded-2xl hover:bg-tg-surface/75 active:scale-[0.99] transition-all border border-transparent hover:border-tg-border/20 shadow-none hover:shadow-sm"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-36 rounded-xl overflow-hidden bg-black shrink-0 border border-tg-border/20 shadow-sm">
                <img
                  src={nextVid.thumbnail}
                  alt={nextVid.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  decoding="async"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('mqdefault.jpg')) {
                      target.src = `https://i.ytimg.com/vi/${nextVid.id}/mqdefault.jpg`;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                {nextVid.duration && (
                  <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/85 backdrop-blur-md text-white shadow">
                    {nextVid.duration}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-xs font-semibold text-tg-text line-clamp-2 leading-snug group-hover:text-tg-blue transition-colors">
                  {nextVid.title}
                </h4>
                <p
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChannel({
                      name: nextVid.channel,
                      avatar: nextVid.channelAvatar,
                      id: nextVid.channelId,
                      url: nextVid.channelUrl,
                    });
                  }}
                  className="text-[11px] text-tg-text-hint truncate mt-1 hover:text-tg-blue transition-colors font-medium"
                >
                  {nextVid.channel}
                </p>
                {nextVid.views && (
                  <p className="text-[10px] text-tg-text-hint mt-0.5">
                    {nextVid.views} • Verified Stream
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
