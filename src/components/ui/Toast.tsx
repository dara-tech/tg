'use client';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface Toast { id: number; message: string; type: 'info' | 'success' | 'error'; }

let toastId = 0;
const listeners = new Set<(t: Toast) => void>();

export function toast(message: string, type: Toast['type'] = 'info') {
  const t = { id: ++toastId, message, type };
  listeners.forEach(cb => cb(t));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const cb = (t: Toast) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 2400);
    };
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={clsx(
            'px-4 py-2 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-xl border animate-slide-down pointer-events-auto flex items-center gap-2 max-w-[320px]',
            t.type === 'success'
              ? 'bg-emerald-500/90 border-emerald-400/40 text-white'
              : t.type === 'error'
              ? 'bg-rose-600/90 border-rose-400/40 text-white'
              : 'bg-tg-bg-secondary/95 border-tg-border text-tg-text'
          )}
        >
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '!' : '•'}</span>
          <span className="truncate">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
