import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  channelAvatar?: string;
  channelId?: string;
  channelUrl?: string;
  thumbnail: string;
  duration?: string;
  category?: 'khmer-music' | 'lofi' | 'tech' | 'podcast' | 'trending';
  views?: string;
}

export type YouTubePlayerMode = 'closed' | 'pip' | 'bar' | 'expanded';

interface YouTubeState {
  currentVideo: YouTubeVideo | null;
  playerMode: YouTubePlayerMode;
  isPlaying: boolean;
  isAudioOnly: boolean;
  favorites: YouTubeVideo[];
  history: YouTubeVideo[];

  // Actions
  playVideo: (video: YouTubeVideo, mode?: YouTubePlayerMode) => void;
  setPlayerMode: (mode: YouTubePlayerMode) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  toggleAudioOnly: () => void;
  closePlayer: () => void;
  toggleFavorite: (video: YouTubeVideo) => void;
  isFavorite: (videoId: string) => boolean;
  clearHistory: () => void;
}

export const useYouTubeStore = create<YouTubeState>()(
  persist(
    (set, get) => ({
      currentVideo: null,
      playerMode: 'closed',
      isPlaying: false,
      isAudioOnly: false,
      favorites: [],
      history: [],

      playVideo: (video, mode = 'pip') => {
        set((state) => {
          // Put at start of history, deduplicate
          const newHistory = [
            video,
            ...state.history.filter((v) => v.id !== video.id),
          ].slice(0, 30);

          return {
            currentVideo: video,
            playerMode: mode,
            isPlaying: true,
            history: newHistory,
          };
        });
      },

      setPlayerMode: (mode) => set({ playerMode: mode }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

      toggleAudioOnly: () => set((state) => ({ isAudioOnly: !state.isAudioOnly })),

      closePlayer: () => set({ playerMode: 'closed', isPlaying: false }),

      toggleFavorite: (video) => {
        set((state) => {
          const exists = state.favorites.some((v) => v.id === video.id);
          if (exists) {
            return {
              favorites: state.favorites.filter((v) => v.id !== video.id),
            };
          } else {
            return {
              favorites: [video, ...state.favorites],
            };
          }
        });
      },

      isFavorite: (videoId) => {
        return get().favorites.some((v) => v.id === videoId);
      },

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'tg-youtube-storage',
      partialize: (state) => ({
        favorites: state.favorites,
        history: state.history,
      }),
    }
  )
);
