import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DailymotionVideo } from '@/services/dailymotion.service';

interface DailymotionState {
  currentVideo: DailymotionVideo | null;
  playerMode: 'open' | 'closed';
  favorites: DailymotionVideo[];

  playVideo: (video: DailymotionVideo) => void;
  closePlayer: () => void;
  toggleFavorite: (video: DailymotionVideo) => void;
  isFavorite: (id: string) => boolean;
}

export const useDailymotionStore = create<DailymotionState>()(
  persist(
    (set, get) => ({
      currentVideo: null,
      playerMode: 'closed',
      favorites: [],

      playVideo: (video) => set({ currentVideo: video, playerMode: 'open' }),
      closePlayer: () => set({ currentVideo: null, playerMode: 'closed' }),

      toggleFavorite: (video) => {
        const { favorites } = get();
        const exists = favorites.some((v) => v.id === video.id);
        if (exists) {
          set({ favorites: favorites.filter((v) => v.id !== video.id) });
        } else {
          set({ favorites: [video, ...favorites] });
        }
      },

      isFavorite: (id) => get().favorites.some((v) => v.id === id),
    }),
    {
      name: 'tg-dailymotion-storage',
      partialize: (s) => ({ favorites: s.favorites }),
    }
  )
);
