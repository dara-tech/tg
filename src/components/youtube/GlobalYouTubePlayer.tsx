'use client';
import {
  X,
  Maximize2,
  Play,
  Pause,
  Volume2,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useYouTubeStore } from '@/store/youtube.store';
import { useEffect, useRef } from 'react';
import {
  startBackgroundAudioSession,
  stopBackgroundAudioSession,
} from '@/services/youtubeBackgroundAudio.service';

export function GlobalYouTubePlayer() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    currentVideo,
    playerMode,
    isPlaying,
    isAudioOnly,
    setPlayerMode,
    togglePlay,
    closePlayer,
  } = useYouTubeStore();

  // If user is currently ON the YouTube page, the YouTube page itself plays the video at the top!
  // We do NOT want a duplicate floating player or black modal overlay.
  const isOnYouTubeScreen =
    location.pathname === '/youtube' || location.pathname === '/tools';

  const pipIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (currentVideo && playerMode !== 'closed') {
      startBackgroundAudioSession(currentVideo, (cmd) => {
        try {
          pipIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: cmd, args: '' }),
            '*'
          );
        } catch {}
      });
    } else {
      stopBackgroundAudioSession();
    }
    return () => {
      stopBackgroundAudioSession();
    };
  }, [currentVideo?.id, playerMode]);

  if (!currentVideo || playerMode === 'closed' || isOnYouTubeScreen) {
    return null;
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${currentVideo.id}?autoplay=1&enablejsapi=1&modestbranding=1&rel=0&playsinline=1`;

  // ──────────────────────────────────────────────
  // Mode 1: Sleek Bottom Mini Audio Bar
  // ──────────────────────────────────────────────
  if (playerMode === 'bar') {
    return (
      <div className="fixed bottom-[88px] left-3 right-3 sm:left-6 sm:right-6 max-w-sm mx-auto z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="bg-tg-surface/90 backdrop-blur-xl border border-tg-border/30 rounded-2xl p-2 shadow-xl flex items-center gap-2.5">
          <div
            onClick={() => navigate('/youtube')}
            className="w-10 h-10 rounded-xl overflow-hidden bg-tg-bg-secondary shrink-0 relative cursor-pointer"
          >
            <img
              src={currentVideo.thumbnail}
              alt={currentVideo.title}
              className="w-full h-full object-cover"
            />
            {isAudioOnly && (
              <div className="absolute inset-0 bg-sky-950/70 flex items-center justify-center text-sky-400">
                <Volume2 className="w-4 h-4 animate-pulse" />
              </div>
            )}
          </div>

          <div
            onClick={() => navigate('/youtube')}
            className="flex-1 min-w-0 cursor-pointer text-left"
          >
            <p className="text-xs font-semibold text-tg-text truncate">
              {currentVideo.title}
            </p>
            <p className="text-[11px] text-tg-text-hint truncate mt-0.5">
              {currentVideo.channel}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-tg-blue text-white flex items-center justify-center active:scale-95 transition-all shadow-sm"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button
              onClick={() => navigate('/youtube')}
              className="w-8 h-8 rounded-full hover:bg-tg-surface text-tg-text-hint hover:text-tg-text flex items-center justify-center transition-all"
              aria-label="Expand"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={closePlayer}
              className="w-8 h-8 rounded-full hover:bg-tg-surface text-tg-text-hint hover:text-rose-400 flex items-center justify-center transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // Mode 2: Native iOS PiP Floating Window
  // ──────────────────────────────────────────────
  return (
    <div className="fixed bottom-[88px] right-3 sm:right-6 w-[240px] sm:w-[280px] rounded-2xl overflow-hidden bg-black shadow-2xl border border-tg-border/30 z-40 select-none animate-in fade-in zoom-in-95 duration-200">
      {/* Native PiP Corner Controls */}
      <button
        onClick={closePlayer}
        className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all border border-white/10"
        title="Close"
        aria-label="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => navigate('/youtube')}
        className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all border border-white/10"
        title="Open YouTube Screen"
        aria-label="Open YouTube Screen"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>

      {/* Video Frame */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center">
        {isAudioOnly ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950/70 to-black p-3 text-center">
            <Volume2 className="w-6 h-6 text-sky-400 animate-pulse mb-1.5" />
            <p className="text-xs font-medium text-white line-clamp-1">{currentVideo.title}</p>
            <p className="text-[10px] text-white/60">{currentVideo.channel}</p>
            <iframe
              ref={pipIframeRef}
              src={embedUrl}
              title={currentVideo.title}
              className="w-1 h-1 opacity-0 pointer-events-none absolute"
              allow="autoplay; encrypted-media"
            />
          </div>
        ) : (
          <iframe
            ref={pipIframeRef}
            src={embedUrl}
            title={currentVideo.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
