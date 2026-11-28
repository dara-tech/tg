import type { YouTubeVideo } from '@/store/youtube.store';

let silentAudio: HTMLAudioElement | null = null;
let activeCommandHandler: ((command: 'playVideo' | 'pauseVideo' | 'stopVideo') => void) | null = null;
let isSessionActive = false;

function getOrCreateAudio(): HTMLAudioElement {
  if (!silentAudio && typeof window !== 'undefined') {
    silentAudio = new Audio('/audio/silence.wav');
    silentAudio.loop = true;
    silentAudio.preload = 'auto';
    silentAudio.setAttribute('playsinline', 'true');
    silentAudio.setAttribute('webkit-playsinline', 'true');
    silentAudio.setAttribute('x-webkit-airplay', 'allow');
  }
  return silentAudio!;
}

function handleVisibility() {
  if (!isSessionActive) return;

  const audio = getOrCreateAudio();
  if (document.hidden) {
    // Screen was locked or switched away
    audio.play().catch(() => {});
    // Burst command to prevent iOS Safari auto-pause
    activeCommandHandler?.('playVideo');
    setTimeout(() => activeCommandHandler?.('playVideo'), 150);
    setTimeout(() => activeCommandHandler?.('playVideo'), 450);
    setTimeout(() => activeCommandHandler?.('playVideo'), 900);
  } else {
    // User unlocked screen or brought PWA to foreground
    activeCommandHandler?.('playVideo');
  }
}

/**
 * Call synchronously inside a user gesture (tap/click) or when video starts
 * to claim the iOS/Android background audio session.
 */
export function unlockAndStartBackgroundAudio(
  video: YouTubeVideo,
  onCommand?: (command: 'playVideo' | 'pauseVideo' | 'stopVideo') => void
) {
  if (typeof window === 'undefined') return;

  isSessionActive = true;
  if (onCommand) {
    activeCommandHandler = onCommand;
  }

  const audio = getOrCreateAudio();
  audio.play().catch(() => {
    // Will resume on subsequent user tap
  });

  document.removeEventListener('visibilitychange', handleVisibility);
  document.addEventListener('visibilitychange', handleVisibility);

  // Setup Native MediaSession (iOS Lock Screen / Control Center / Android Media)
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: video.title || 'YouTube Video',
        artist: video.channel || 'YouTube Media Player',
        album: 'Telegram YouTube Hub',
        artwork: [
          { src: video.thumbnail, sizes: '512x512', type: 'image/jpeg' },
          { src: video.thumbnail, sizes: '256x256', type: 'image/jpeg' },
          { src: video.thumbnail, sizes: '128x128', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.playbackState = 'playing';

      navigator.mediaSession.setActionHandler('play', () => {
        const a = getOrCreateAudio();
        a.play().catch(() => {});
        navigator.mediaSession.playbackState = 'playing';
        activeCommandHandler?.('playVideo');
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        const a = getOrCreateAudio();
        a.pause();
        navigator.mediaSession.playbackState = 'paused';
        activeCommandHandler?.('pauseVideo');
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        const a = getOrCreateAudio();
        a.pause();
        navigator.mediaSession.playbackState = 'none';
        activeCommandHandler?.('stopVideo');
      });
    } catch (e) {
      console.warn('MediaSession error:', e);
    }
  }
}

export function setBackgroundAudioCommandHandler(
  handler: (command: 'playVideo' | 'pauseVideo' | 'stopVideo') => void
) {
  activeCommandHandler = handler;
}

/**
 * Cleanly releases background audio session
 */
export function stopBackgroundAudioSession() {
  if (typeof window === 'undefined') return;

  isSessionActive = false;
  activeCommandHandler = null;

  if (silentAudio) {
    try {
      silentAudio.pause();
      silentAudio.currentTime = 0;
    } catch {}
  }

  document.removeEventListener('visibilitychange', handleVisibility);

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata = null;
    } catch {}
  }
}
