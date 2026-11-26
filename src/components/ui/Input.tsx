import clsx from 'clsx';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-tg-text-secondary text-xs font-semibold uppercase tracking-wider mb-1.5">{label}</label>}
      <input
        {...props}
        className={clsx(
          'w-full bg-tg-surface border border-tg-border/40 rounded-xl px-4 py-3 text-tg-text text-sm',
          'placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue/70 transition-colors',
          error && 'border-tg-red',
          className
        )}
      />
      {error ? (
        <p className="text-tg-red text-xs mt-1">{error}</p>
      ) : hint ? (
        <p className="text-tg-text-hint text-xs mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-tg-text-secondary text-xs font-semibold uppercase tracking-wider mb-1.5">{label}</label>}
      <textarea
        {...props}
        className={clsx(
          'w-full bg-tg-surface border border-tg-border/40 rounded-xl px-4 py-2.5 text-tg-text text-sm resize-none',
          'placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue/70 transition-colors',
          error && 'border-tg-red',
          className
        )}
      />
      {error ? (
        <p className="text-tg-red text-xs mt-1">{error}</p>
      ) : hint ? (
        <p className="text-tg-text-hint text-xs mt-1">{hint}</p>
      ) : null}
    </div>
  );
}
