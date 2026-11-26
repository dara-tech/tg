'use client';

interface TelegramTicksProps {
  /** 'single' for sent, 'double' for delivered/read */
  variant: 'single' | 'double';
  className?: string;
}

/**
 * Authentic Telegram-style single and overlapping parallel double checkmarks.
 */
export function TelegramTicks({ variant, className = 'w-4 h-3 shrink-0' }: TelegramTicksProps) {
  if (variant === 'single') {
    return (
      <svg
        viewBox="0 0 15 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <path
          d="M2 6.8L5.5 10.2L13 2.3"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 18 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M1.5 6.8L4.8 10L11.5 2.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.2 8.2L9 10L15.7 2.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
