'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
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
      setToasts((prev) => [...prev.slice(-2), t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 2800);
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
      className="fixed left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none w-full max-w-[92vw] sm:max-w-md px-4 transition-all"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={clsx(
            'pointer-events-auto cursor-pointer flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-2xl border transition-all active:scale-95 duration-200 animate-slide-up select-none w-auto max-w-full',
            t.type === 'success' && 'bg-[#1C1C1E]/95 border-emerald-500/40 text-white shadow-emerald-950/20',
            t.type === 'error' && 'bg-[#1C1C1E]/95 border-rose-500/40 text-white shadow-rose-950/20',
            t.type === 'info' && 'bg-[#1C1C1E]/95 border-white/15 text-white shadow-black/40'
          )}
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-tg-blue shrink-0" />}

          <span className="text-xs font-semibold leading-normal pb-0.5 break-words line-clamp-2">
            {t.message}
          </span>

          <X className="w-3.5 h-3.5 text-white/50 hover:text-white shrink-0 ml-1" />
        </div>
      ))}
    </div>
  );
}
