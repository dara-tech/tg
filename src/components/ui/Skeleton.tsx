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
  return (
    <div className="w-full flex flex-col space-y-2.5 pt-4 pb-2 animate-pulse mt-auto select-none pointer-events-none">
      {/* Date badge */}
      <div className="flex justify-center my-2">
        <div className="w-24 h-5 rounded-full bg-tg-surface/60 border border-tg-border/20" />
      </div>

      {/* Incoming run 1 */}
      <div className="flex items-end gap-2 w-full max-w-[85%]">
        <div className="w-8 h-8 rounded-full bg-tg-surface shrink-0 mb-0.5" />
        <div className="flex flex-col gap-1 w-full">
          <div className="h-[48px] w-[75%] rounded-[18px] rounded-bl-[5px] bg-tg-surface/70 border border-tg-border/15 p-2.5 flex flex-col justify-between">
            <div className="w-[60%] h-2.5 bg-tg-text-hint/20 rounded-full" />
            <div className="w-8 h-2 bg-tg-text-hint/15 rounded-full self-end" />
          </div>
          <div className="h-[40px] w-[50%] rounded-[18px] rounded-bl-[5px] bg-tg-surface/70 border border-tg-border/15 p-2.5 flex flex-col justify-between">
            <div className="w-[80%] h-2.5 bg-tg-text-hint/20 rounded-full" />
            <div className="w-8 h-2 bg-tg-text-hint/15 rounded-full self-end" />
          </div>
        </div>
      </div>

      {/* Outgoing run 1 */}
      <div className="flex flex-col items-end gap-1 w-full ml-auto max-w-[85%]">
        <div className="h-[46px] w-[65%] rounded-[18px] rounded-br-[5px] bg-tg-blue/20 border border-tg-blue/25 p-2.5 flex flex-col justify-between">
          <div className="w-[70%] h-2.5 bg-tg-blue/30 rounded-full" />
          <div className="w-8 h-2 bg-tg-blue/25 rounded-full self-end" />
        </div>
        {/* Outgoing photo bubble */}
        <div className="w-[240px] h-[175px] rounded-[18px] rounded-br-[5px] bg-tg-blue/15 border border-tg-blue/20 relative flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-tg-blue/20" />
          <div className="absolute bottom-2 right-2 w-10 h-2 bg-tg-blue/30 rounded-full" />
        </div>
      </div>

      {/* Incoming photo message */}
      <div className="flex items-end gap-2 w-full max-w-[85%]">
        <div className="w-8 h-8 rounded-full bg-tg-surface shrink-0 mb-0.5" />
        <div className="w-[240px] h-[180px] rounded-[18px] rounded-bl-[5px] bg-tg-surface/70 border border-tg-border/15 relative flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-tg-surface" />
          <div className="absolute bottom-2 right-2 w-10 h-2 bg-tg-text-hint/20 rounded-full" />
        </div>
      </div>

      {/* Outgoing short message */}
      <div className="flex justify-end w-full">
        <div className="h-[38px] w-[35%] rounded-[18px] rounded-br-[5px] bg-tg-blue/20 border border-tg-blue/25 p-2.5 flex items-center justify-between">
          <div className="w-[50%] h-2.5 bg-tg-blue/30 rounded-full" />
          <div className="w-8 h-2 bg-tg-blue/25 rounded-full" />
        </div>
      </div>
    </div>
  );
}
