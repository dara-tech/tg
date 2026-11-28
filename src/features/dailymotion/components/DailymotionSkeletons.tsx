import React from 'react';
import { Loader2 } from 'lucide-react';

export function DailymotionFeedSkeleton({
  count = 6,
  label,
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div className="space-y-4">
      {label && (
        <div className="flex items-center gap-2 py-1 px-1 text-xs text-tg-text-hint">
          <Loader2 className="w-3.5 h-3.5 text-[#0066dc] animate-spin shrink-0" />
          <span>{label}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-tg-border/20 overflow-hidden bg-tg-surface/40 animate-pulse"
          >
            <div className="aspect-video w-full bg-tg-surface/70 relative">
              <div className="absolute bottom-2.5 right-2.5 w-10 h-4 bg-tg-bg/50 rounded" />
            </div>
            <div className="p-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-tg-surface/80 shrink-0" />
              <div className="flex-1 space-y-2 py-0.5">
                <div className="h-3.5 bg-tg-surface/80 rounded-md w-5/6" />
                <div className="h-3 bg-tg-surface/50 rounded-md w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailymotionChannelSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 py-1 text-xs text-tg-text-hint">
        <Loader2 className="w-3.5 h-3.5 text-[#0066dc] animate-spin shrink-0" />
        <span>Loading channel videos...</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-tg-border/20 overflow-hidden bg-tg-surface/40 animate-pulse"
          >
            <div className="aspect-video w-full bg-tg-surface/70" />
            <div className="p-3 space-y-2">
              <div className="h-3.5 bg-tg-surface/80 rounded w-4/5" />
              <div className="h-2.5 bg-tg-surface/50 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailymotionPlayerLoadingOverlay({
  thumbnail,
  title,
}: {
  thumbnail?: string;
  title?: string;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden bg-black">
      {thumbnail && (
        <img
          src={thumbnail}
          alt={title || 'Dailymotion Video'}
          className="absolute inset-0 w-full h-full object-cover blur-sm opacity-40 scale-105"
        />
      )}
      <div className="relative z-10 flex flex-col items-center gap-2.5">
        <div className="w-11 h-11 rounded-full border-3 border-white/20 border-t-[#0066dc] animate-spin" />
        <span className="text-[11px] font-semibold text-white/90 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md">
          កំពុងផ្ទុកវីដេអូ...
        </span>
      </div>
    </div>
  );
}
