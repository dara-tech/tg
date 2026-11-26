import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthorized: boolean;
  isLoading: boolean;
  phone: string;
  phoneCodeHash: string;
  userId: number | null;
  setPhone: (phone: string) => void;
  setPhoneCodeHash: (hash: string) => void;
  setAuthorized: (userId: number) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthorized: false,
      isLoading: false,
      phone: '',
      phoneCodeHash: '',
      userId: null,
      setPhone: (phone) => set({ phone }),
      setPhoneCodeHash: (phoneCodeHash) => set({ phoneCodeHash }),
      setAuthorized: (userId) => set({ isAuthorized: true, userId }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ isAuthorized: false, userId: null, phone: '', phoneCodeHash: '' }),
    }),
    { name: 'tg-auth', partialize: (s) => ({ isAuthorized: s.isAuthorized, userId: s.userId }) }
  )
);
