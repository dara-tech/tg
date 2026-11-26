import clsx from 'clsx';

export function Badge({ count, muted }: { count: number; muted?: boolean }) {
  if (!count || count <= 0) return null;
  const isSingleDigit = count < 10;
  return (
    <span
      data-badge="true"
      className={clsx(
        'h-5 inline-flex items-center justify-center font-bold text-[11px] leading-none tabular-nums shrink-0 shadow-sm transition-transform select-none',
        isSingleDigit ? 'w-5 min-w-[20px] rounded-full' : 'min-w-[20px] px-1.5 rounded-full',
        muted
          ? 'bg-tg-text-hint/35 text-tg-text-secondary'
          : 'bg-tg-blue text-white'
      )}
    >
      {count > 999 ? '999+' : count}
    </span>
  );
}
