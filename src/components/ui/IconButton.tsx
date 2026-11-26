import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function IconButton({ children, className, ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        'w-10 h-10 flex items-center justify-center rounded-full text-tg-text-secondary',
        'active:bg-tg-surface transition-colors',
        className
      )}
    >
      {children}
    </button>
  );
}
