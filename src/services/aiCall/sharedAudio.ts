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
    // Default to hardware sample rate (typically 48000Hz or 44100Hz)
    // so createMediaStreamSource(micStream) matches hardware mic rate without error
    sharedAudioCtx = new AudioCtxClass();
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
    // Play a tiny silent buffer to force mobile browser / Safari audio unlock
    const silent = ctx.createBuffer(1, 1, 24000);
    const src = ctx.createBufferSource();
    src.buffer = silent;
    src.connect(ctx.destination);
    src.start();
  } catch (err) {
    console.warn('[sharedAudio] Unlock error:', err);
  }
}
