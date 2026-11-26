'use client';
import * as React from 'react';
import clsx from 'clsx';

export type BubbleVariant =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'tinted'
  | 'outline'
  | 'ghost'
  | 'destructive';

export type BubbleAlign = 'start' | 'end';

const variantStyles: Record<BubbleVariant, string> = {
  default:     'chat-go-gradient text-white',
  secondary:   'bg-tg-bg-secondary border border-tg-border/40 text-tg-text',
  muted:       'bg-tg-surface text-tg-text-secondary',
  tinted:      'bg-tg-blue/15 text-tg-blue border border-tg-blue/30',
  outline:     'bg-transparent border border-tg-border/40 text-tg-text',
  ghost:       'bg-transparent text-tg-text',
  destructive: 'bg-rose-600 text-white',
};

export interface BubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BubbleVariant;
  align?: BubbleAlign;
}

export const Bubble = React.forwardRef<HTMLDivElement, BubbleProps>(
  ({ className, variant = 'default', align = 'start', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="bubble"
        data-align={align}
        data-variant={variant}
        className={clsx(
          'group/bubble relative flex w-fit max-w-[82%] min-w-0 flex-col gap-1',
          align === 'end' ? 'ml-auto items-end' : 'mr-auto items-start',
          className
        )}
        {...props}
      >
        <div
          data-slot="bubble-surface"
          className={clsx(
            'relative max-w-full min-w-0 rounded-[18px] text-sm transition-colors',
            variant !== 'ghost' && 'shadow-sm',
            align === 'end' ? 'rounded-br-[5px]' : 'rounded-bl-[5px]',
            variantStyles[variant]
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);
Bubble.displayName = 'Bubble';

export interface BubbleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export const BubbleContent = React.forwardRef<HTMLDivElement, BubbleContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="bubble-content"
        className={clsx('min-w-0 px-3.5 py-2 leading-relaxed break-words [overflow-wrap:anywhere]', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
BubbleContent.displayName = 'BubbleContent';

export interface BubbleReactionsProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: BubbleAlign;
}

export const BubbleReactions = React.forwardRef<HTMLDivElement, BubbleReactionsProps>(
  ({ className, align = 'start', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="bubble-reactions"
        className={clsx(
          'flex flex-wrap items-center gap-1.5 px-3.5 pb-2 pt-0',
          align === 'end' ? 'justify-end' : 'justify-start',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
BubbleReactions.displayName = 'BubbleReactions';

export interface BubbleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: BubbleAlign;
}

export const BubbleGroup = React.forwardRef<HTMLDivElement, BubbleGroupProps>(
  ({ className, align = 'start', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="bubble-group"
        data-align={align}
        className={clsx(
          'flex w-full flex-col gap-1 mb-2',
          align === 'end' ? 'items-end' : 'items-start',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
BubbleGroup.displayName = 'BubbleGroup';
