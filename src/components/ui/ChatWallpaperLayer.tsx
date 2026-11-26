'use client';
import { CHAT_WALLPAPERS, type ChatWallpaperId } from '@/store/ui.store';

export function ChatWallpaperLayer({
  wallpaper,
  customImage,
  dim = 20,
  blur = false,
}: {
  wallpaper: ChatWallpaperId;
  customImage?: string | null;
  dim?: number;
  blur?: boolean;
}) {
  if (wallpaper === 'default') return null;

  const isCustom = wallpaper === 'custom' && Boolean(customImage);
  const preset = wallpaper !== 'custom' ? CHAT_WALLPAPERS[wallpaper] : undefined;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {isCustom && customImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-300"
          style={{
            backgroundImage: `url(${customImage})`,
            filter: blur ? 'blur(10px)' : undefined,
            transform: blur ? 'scale(1.06)' : undefined,
          }}
        />
      ) : preset?.gradient ? (
        <div
          className="absolute inset-0 transition-all duration-300"
          style={{
            backgroundImage: preset.gradient,
            filter: blur ? 'blur(12px)' : undefined,
            transform: blur ? 'scale(1.06)' : undefined,
          }}
        />
      ) : null}

      {/* Subtle Telegram geometric pattern overlay for preset wallpapers */}
      {!isCustom && preset?.pattern && (
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18px 18px, currentColor 1.4px, transparent 1.4px), radial-gradient(circle at 46px 46px, currentColor 1.1px, transparent 1.1px)',
            backgroundSize: '64px 64px',
          }}
        />
      )}

      {/* Dim overlay for readability */}
      {dim > 0 && (
        <div
          className="absolute inset-0 bg-black transition-opacity duration-200"
          style={{ opacity: Math.min(0.65, Math.max(0, dim / 100)) }}
        />
      )}
    </div>
  );
}
