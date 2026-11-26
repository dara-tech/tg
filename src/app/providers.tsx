'use client';
import { useEffect } from 'react';
import { MTProtoProvider } from '@/providers/MTProtoProvider';
import { ToastContainer }  from '@/components/ui/Toast';
import { ActiveCallOverlay } from '@/components/call/ActiveCallOverlay';
import { ACCENT_COLORS, BG_THEMES, KHMER_FONTS, useUIStore } from '@/store/ui.store';

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  const accent = useUIStore((s) => s.accent);
  const khmerFont = useUIStore((s) => s.khmerFont);

  useEffect(() => {
    const root = document.documentElement;
    const safeTheme = BG_THEMES[theme] ? theme : 'black';
    root.dataset.theme = safeTheme;
    const colors = ACCENT_COLORS[accent] ?? ACCENT_COLORS.purple;
    root.style.setProperty('--tg-blue', colors.primary);
    root.style.setProperty('--tg-blue-rgb', hexToRgb(colors.primary));
    root.style.setProperty('--tg-blue-dark', colors.dark);
    root.style.setProperty('--tg-blue-dark-rgb', hexToRgb(colors.dark));
    root.style.setProperty('--tg-bubble', colors.primary);
    root.style.setProperty('--tg-bubble-rgb', hexToRgb(colors.primary));
  }, [theme, accent]);

  useEffect(() => {
    let cancelled = false;
    const root = document.documentElement;
    const fontMeta = KHMER_FONTS[khmerFont] ?? KHMER_FONTS.hanuman;
    const familyStack = `"ActiveKhmerFont", "BattambangKhmer", "Google Sans", "Google Sans Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    root.style.setProperty('--tg-khmer-font', '"ActiveKhmerFont"');
    document.body.style.fontFamily = familyStack;

    const url = `https://fonts.googleapis.com/css2?family=${fontMeta.query}&display=swap`;
    fetch(url)
      .then((res) => res.text())
      .then((css) => {
        if (cancelled) return;
        // Rewrite Google Fonts @font-face to ActiveKhmerFont strictly scoped to Khmer Unicode blocks
        // so Google Sans never overrides Khmer and the Khmer font never overrides English.
        const scopedCss = css.replace(/@font-face\s*\{([^}]*)\}/g, (_match, body: string) => {
          const cleaned = body
            .replace(/font-family:\s*['"][^'"]+['"]\s*;/g, "font-family: 'ActiveKhmerFont';")
            .replace(/unicode-range:\s*[^;]+;/g, '');
          return `@font-face {${cleaned}\n  unicode-range: U+1780-17FF, U+19E0-19FF, U+200C-200D, U+25CC;\n}`;
        });
        const styleId = 'tg-khmer-font-style';
        let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = scopedCss;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [khmerFont]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const syncKeyboard = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
      const root = document.documentElement;
      const baseHeight = Math.max(window.innerHeight, root.clientHeight);
      const offsetTop = Math.max(0, vv.offsetTop);
      const keyboardOpen = baseHeight - vv.height > 40 || offsetTop > 0;
      if (keyboardOpen) {
        root.dataset.keyboard = 'open';
        root.style.setProperty('--app-height', `${vv.height}px`);
        root.style.setProperty('--app-top', `${offsetTop}px`);
      } else {
        delete root.dataset.keyboard;
        root.style.removeProperty('--app-height');
        root.style.removeProperty('--app-top');
      }
    };
    const timers: number[] = [];
    const scheduleSync = () => {
      syncKeyboard();
      requestAnimationFrame(syncKeyboard);
      timers.push(window.setTimeout(syncKeyboard, 60));
      timers.push(window.setTimeout(syncKeyboard, 180));
      timers.push(window.setTimeout(syncKeyboard, 350));
    };
    const onFocusOut = () => {
      window.scrollTo(0, 0);
      scheduleSync();
    };
    vv.addEventListener('resize', syncKeyboard);
    vv.addEventListener('scroll', syncKeyboard);
    window.addEventListener('scroll', syncKeyboard, { passive: true });
    window.addEventListener('focusin', scheduleSync);
    window.addEventListener('focusout', onFocusOut);
    return () => {
      timers.forEach((t) => clearTimeout(t));
      vv.removeEventListener('resize', syncKeyboard);
      vv.removeEventListener('scroll', syncKeyboard);
      window.removeEventListener('scroll', syncKeyboard);
      window.removeEventListener('focusin', scheduleSync);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
    } else {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <MTProtoProvider>
      {children}
      <ActiveCallOverlay />
      <ToastContainer />
    </MTProtoProvider>
  );
}
