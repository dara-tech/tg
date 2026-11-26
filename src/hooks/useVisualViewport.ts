'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to track the mobile visual viewport height (accounting for virtual keyboard)
 * and whether the on-screen keyboard is currently open on iOS Safari / Chrome.
 */
export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;

    const update = () => {
      const currentHeight = vv ? Math.round(vv.height) : window.innerHeight;
      // In iOS Safari / Chrome, keyboard is open if visualViewport.height is significantly
      // smaller than window.innerHeight (typically >80px difference)
      const keyboardActive = window.innerHeight - currentHeight > 80;

      setIsKeyboardOpen(keyboardActive);
      setViewportHeight(currentHeight);

      // On iOS Safari, keep window scroll locked to 0 so the document itself does not translate/scroll
      if (keyboardActive && window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      update();
    } else {
      window.addEventListener('resize', update);
      update();
    }

    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      } else {
        window.removeEventListener('resize', update);
      }
    };
  }, []);

  return { viewportHeight, isKeyboardOpen };
}
