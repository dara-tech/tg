'use client';

export function DialogSkeletonList({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-0.5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <div className="w-11 h-11 rounded-full bg-tg-surface shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex justify-between items-center gap-4">
              <div className="h-3.5 bg-tg-surface rounded-full w-32" />
              <div className="h-2.5 bg-tg-surface rounded-full w-10" />
            </div>
            <div className="h-3 bg-tg-surface/70 rounded-full w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageSkeletonList() {
  const widths = ['w-48', 'w-60', 'w-36', 'w-56', 'w-44', 'w-52'];
  return (
    <div className="space-y-3 py-3 animate-pulse">
      {widths.map((w, i) => {
        const out = i % 2 === 1;
        return (
          <div key={i} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`h-11 ${w} rounded-2xl ${
                out ? 'bg-tg-blue/25 rounded-br-[4px]' : 'bg-tg-bg-secondary rounded-bl-[4px]'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
