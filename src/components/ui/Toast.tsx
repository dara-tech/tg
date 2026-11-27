'use client';
import { useEffect, useState } from 'react';
import { Check, AlertCircle, Info } from 'lucide-react';
import clsx from 'clsx';

export interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

let toastId = 0;
const listeners = new Set<(t: ToastItem) => void>();

export function toast(message: string, type: ToastItem['type'] = 'info') {
  const t: ToastItem = { id: ++toastId, message, type };
  listeners.forEach((cb) => cb(t));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const cb = (t: ToastItem) => {
      // Keep only the most recent toast for a clean, short, professional presentation
      setToasts([t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 2200);
    };
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col items-center gap-1.5 w-auto max-w-[90vw] transition-all"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 74px)',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={clsx(
            'pointer-events-auto cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-full shadow-lg backdrop-blur-xl bg-tg-bg-secondary/95 text-tg-text border transition-all active:scale-95 duration-150 select-none max-w-full animate-toast-enter',
            t.type === 'success' && 'border-emerald-500/40',
            t.type === 'error' && 'border-tg-red/40',
            t.type === 'info' && 'border-tg-border/60'
          )}
        >
          {t.type === 'success' && (
            <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          )}
          {t.type === 'error' && (
            <span className="w-4 h-4 rounded-full bg-tg-red/15 text-tg-red flex items-center justify-center shrink-0">
              <AlertCircle className="w-2.5 h-2.5 stroke-[2.5]" />
            </span>
          )}
          {t.type === 'info' && (
            <span className="w-4 h-4 rounded-full bg-tg-blue/15 text-tg-blue flex items-center justify-center shrink-0">
              <Info className="w-2.5 h-2.5 stroke-[2.5]" />
            </span>
          )}

          <span className="text-[12px] font-medium tracking-tight text-tg-text truncate max-w-[280px]">
            {t.message}
          </span>
        </div>
      ))}
    </div>
  );
}
