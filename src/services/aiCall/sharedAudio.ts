let sharedAudioCtx: AudioContext | null = null;

/**
 * Returns a globally shared AudioContext that can be unlocked on user click
 * and shared with AICallService for instant audio output.
 */
export function getSharedAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext is only available in browser');
  }

  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtxClass) {
    throw new Error('Web Audio API is not supported in this browser');
  }

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    try {
      sharedAudioCtx = new AudioCtxClass();
    } catch {
      sharedAudioCtx = new AudioCtxClass();
    }
  }

  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }

  return sharedAudioCtx;
}

/**
 * Call synchronously inside click handlers (e.g., Call button) to unlock audio playback.
 */
export function unlockAudioPlayback(): void {
  try {
    const ctx = getSharedAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch (err) {
    console.warn('[sharedAudio] Unlock error:', err);
  }
}
