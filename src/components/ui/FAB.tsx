'use client';
import clsx from 'clsx';

interface FABProps {
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function FAB({ onClick, icon, className }: FABProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'absolute bottom-4 right-4 w-14 h-14 rounded-full chat-go-gradient shadow-xl',
        'flex items-center justify-center active:scale-95 transition-transform z-30 border border-white/15',
        className
      )}
    >
      {icon ?? (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      )}
    </button>
  );
}
