'use client';
import { useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  description,
  maxWidth = 'sm:max-w-md',
  showCloseButton = true,
  className,
}: BottomSheetProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Dialog Modal container */}
      <div
        className={clsx(
          'relative w-full bg-tg-bg-secondary border-t sm:border border-tg-border/40',
          'rounded-t-3xl sm:rounded-2xl',
          'shadow-2xl z-10 overflow-hidden flex flex-col',
          'animate-slide-up sm:animate-fade-in',
          'max-h-[92vh] sm:max-h-[85vh] safe-bottom sm:pb-0',
          maxWidth,
          className
        )}
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex items-center justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-tg-text-hint/30" />
        </div>

        {/* Modal Header */}
        {title ? (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-tg-border/35 shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <h2 className="text-tg-text font-semibold text-base tracking-tight truncate">
                {title}
              </h2>
              {description && (
                <p className="text-tg-text-secondary text-xs truncate mt-0.5">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-tg-text-secondary hover:text-tg-text hover:bg-tg-surface active:scale-95 transition-all shrink-0 -mr-1"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : null}

        {/* Modal Body / Scrollable Content */}
        <div className="overflow-y-auto flex-1 scrollbar-hide">
          {children}
        </div>
      </div>
    </div>
  );
}
