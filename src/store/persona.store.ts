import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CustomVoice = 'Aoede' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';

export interface CustomPersona {
  id: string;           // uuid
  name: string;
  tagline: string;
  description: string;
  voice: CustomVoice;
  prompt: string;
  greeting: string;
  avatarEmoji: string;  // e.g. "🤖"
  avatarImage?: string; // base64 data URL from Cloudflare image gen
  gradientFrom: string; // hex
  gradientTo: string;   // hex
  createdAt: number;
  updatedAt: number;
}

interface PersonaStoreState {
  customs: CustomPersona[];
  addPersona: (p: Omit<CustomPersona, 'id' | 'createdAt' | 'updatedAt'>) => CustomPersona;
  updatePersona: (id: string, patch: Partial<Omit<CustomPersona, 'id' | 'createdAt'>>) => void;
  deletePersona: (id: string) => void;
  getPersona: (id: string) => CustomPersona | undefined;
}

function uid() {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const usePersonaStore = create<PersonaStoreState>()(
  persist(
    (set, get) => ({
      customs: [],

      addPersona: (p) => {
        const now = Date.now();
        const persona: CustomPersona = { ...p, id: uid(), createdAt: now, updatedAt: now };
        set((s) => ({ customs: [...s.customs, persona] }));
        return persona;
      },

      updatePersona: (id, patch) => {
        set((s) => ({
          customs: s.customs.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
          ),
        }));
      },

      deletePersona: (id) => {
        set((s) => ({ customs: s.customs.filter((p) => p.id !== id) }));
      },

      getPersona: (id) => get().customs.find((p) => p.id === id),
    }),
    { name: 'tg-custom-personas' },
  ),
);
