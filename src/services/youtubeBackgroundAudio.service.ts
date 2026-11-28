import type { YouTubeVideo } from '@/store/youtube.store';

// 44-byte standard valid PCM silent WAV audio loop
const SILENT_AUDIO_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let silentAudio: HTMLAudioElement | null = null;
let activeCommandHandler: ((command: string) => void) | null = null;
let isSessionActive = false;

function getOrCreateAudioElement(): HTMLAudioElement {
  if (!silentAudio && typeof window !== 'undefined') {
    silentAudio = new Audio(SILENT_AUDIO_URI);
    silentAudio.loop = true;
    silentAudio.preload = 'auto';
    silentAudio.setAttribute('playsinline', 'true');
    silentAudio.setAttribute('webkit-playsinline', 'true');
  }
  return silentAudio!;
}

// Handler for screen lock / tab hidden
function handleVisibilityChange() {
  if (!isSessionActive || !document.hidden) return;

  const audio = getOrCreateAudioElement();
  audio.play().catch(() => {});

  if (activeCommandHandler) {
    // Re-assert playVideo commands to counteract Mobile Safari auto-pause on screen off
    activeCommandHandler('playVideo');
    setTimeout(() => activeCommandHandler?.('playVideo'), 150);
    setTimeout(() => activeCommandHandler?.('playVideo'), 400);
  }
}

/**
 * Initializes and locks the background audio session for Mobile Safari / PWA
 * Controls Lock Screen Now Playing widget & prevents audio pausing on screen-off.
 */
export function startBackgroundAudioSession(
  video: YouTubeVideo,
  onCommand?: (command: 'playVideo' | 'pauseVideo' | 'stopVideo') => void
) {
  if (typeof window === 'undefined') return;

  activeCommandHandler = onCommand || null;
  isSessionActive = true;

  const audio = getOrCreateAudioElement();
  audio.play().catch(() => {
    // Some browsers require explicit user tap, will resume on first tap
  });

  // Attach visibility listener for screen off
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Configure Native MediaSession (iOS Lock Screen / Control Center / Android Media)
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: video.title || 'YouTube Video',
        artist: video.channel || 'YouTube Media Player',
        album: 'Telegram YouTube Hub',
        artwork: [
          { src: video.thumbnail, sizes: '512x512', type: 'image/jpeg' },
          { src: video.thumbnail, sizes: '128x128', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.playbackState = 'playing';

      navigator.mediaSession.setActionHandler('play', () => {
        const a = getOrCreateAudioElement();
        a.play().catch(() => {});
        navigator.mediaSession.playbackState = 'playing';
        activeCommandHandler?.('playVideo');
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        const a = getOrCreateAudioElement();
        a.pause();
        navigator.mediaSession.playbackState = 'paused';
        activeCommandHandler?.('pauseVideo');
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        const a = getOrCreateAudioElement();
        a.pause();
        navigator.mediaSession.playbackState = 'none';
        activeCommandHandler?.('stopVideo');
      });
    } catch (e) {
      console.warn('MediaSession setup error:', e);
    }
  }
}

/**
 * Cleanly releases background audio session when player is closed
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

  document.removeEventListener('visibilitychange', handleVisibilityChange);

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata = null;
    } catch {}
  }
}
