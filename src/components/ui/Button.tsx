import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary:   'bg-tg-blue text-white active:bg-tg-blue-dark',
  secondary: 'bg-tg-surface text-tg-text active:bg-tg-border',
  danger:    'bg-tg-red text-white active:opacity-80',
  ghost:     'bg-transparent text-tg-blue active:bg-tg-surface',
};
const sizeMap = { sm: 'h-9 px-4 text-sm', md: 'h-12 px-6 text-base', lg: 'h-14 px-8 text-lg' };

export function Button({ variant = 'primary', size = 'md', loading, children, disabled, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx('w-full rounded-xl font-semibold transition-all flex items-center justify-center gap-2',
        variants[variant], sizeMap[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {loading ? (
        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      ) : children}
    </button>
  );
}
