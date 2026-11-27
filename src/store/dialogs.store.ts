import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RealCallItem, RealContactItem } from '@/services/telegram.real';

export interface DialogMediaMeta {
  kind: 'photo' | 'voice' | 'video' | 'sticker' | 'document' | 'geo' | 'contact' | 'poll' | 'webpage';
  id: string;
  accessHash: string;
  fileReference?: number[];
  dcId?: number;
  thumbSize?: string;
  mimeType?: string;
  fileName?: string;
}

export interface ChatPermissions {
  isBroadcast: boolean;
  isMegagroup: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  isLeft: boolean;
  canSendMessages: boolean;
  canSendMedia: boolean;
  canSendStickers: boolean;
  canSendPolls: boolean;
  canPinMessages: boolean;
  canChangeInfo: boolean;
  canInviteUsers: boolean;
  restrictionReason?: string;
}

export interface NormalizedDialog {
  id: string;
  title: string;
  avatarColor: string;
  avatarLetters: string;
  lastMessage: string;
  lastMessageOut?: boolean;
  lastMessageRead?: boolean;
  lastMessageDate: number;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isOnline: boolean;
  peerType: 'user' | 'chat' | 'channel';
  peerId: number;
  accessHash?: string;
  readOutboxMaxId?: number;
  readInboxMaxId?: number;
  hasPhoto?: boolean;
  photoId?: string;
  dcId?: number;
  topMessageId?: number;
  isSavedMessages?: boolean;
  lastMessageMedia?: DialogMediaMeta;
  isBroadcast?: boolean;
  isMegagroup?: boolean;
  isCreator?: boolean;
  isAdmin?: boolean;
  isLeft?: boolean;
  permissions?: ChatPermissions;
}

interface DialogsState {
  dialogs: NormalizedDialog[];
  contacts: RealContactItem[];
  calls: RealCallItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  lastFetchedAt: number;
  setDialogs: (dialogs: NormalizedDialog[], hasMore?: boolean) => void;
  setContacts: (contacts: RealContactItem[]) => void;
  setCalls: (calls: RealCallItem[]) => void;
  appendDialogs: (dialogs: NormalizedDialog[], hasMore?: boolean) => void;
  setLoading: (v: boolean) => void;
  setLoadingMore: (v: boolean) => void;
  setHasMore: (v: boolean) => void;
  updateUnread: (id: string, count: number) => void;
  updateLastMessage: (id: string, msg: string, date: number, out?: boolean, read?: boolean, media?: DialogMediaMeta) => void;
  updateDialogMeta: (id: string, patch: Partial<NormalizedDialog>) => void;
}

const AVATAR_COLORS = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9'];

export function getAvatarColor(id: number) {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

export function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function sortDialogs(dialogs: NormalizedDialog[]): NormalizedDialog[] {
  return [...dialogs].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.lastMessageDate - a.lastMessageDate;
  });
}

export const useDialogsStore = create<DialogsState>()(
  persist(
    (set) => ({
      dialogs: [],
      contacts: [],
      calls: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      lastFetchedAt: 0,

      setDialogs: (dialogs, hasMore = true) => set({
        dialogs: sortDialogs(dialogs),
        hasMore,
        lastFetchedAt: Date.now(),
      }),
      setContacts: (contacts) => set({ contacts }),
      setCalls: (calls) => set({ calls }),

      appendDialogs: (more, hasMore = true) => set(s => {
        const existingIds = new Set(s.dialogs.map(d => d.id));
        const newItems = more.filter(m => !existingIds.has(m.id));
        return {
          dialogs: sortDialogs([...s.dialogs, ...newItems]),
          hasMore,
        };
      }),

      setLoading: (isLoading) => set({ isLoading }),
      setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
      setHasMore: (hasMore) => set({ hasMore }),

      updateUnread: (id, count) => set(s => ({
        dialogs: s.dialogs.map(d => d.id === id ? { ...d, unreadCount: count } : d),
      })),

      updateLastMessage: (id, msg, date, out = true, read = false, media) => set(s => {
        const updated = s.dialogs.map(d =>
          d.id === id
            ? { ...d, lastMessage: msg, lastMessageDate: date, lastMessageOut: out, lastMessageRead: read, lastMessageMedia: media }
            : d
        );
        return { dialogs: sortDialogs(updated) };
      }),

      updateDialogMeta: (id, patch) => set(s => ({
        dialogs: s.dialogs.map(d => d.id === id ? { ...d, ...patch } : d),
      })),
    }),
    {
      name: 'tg-dialogs-v2',
      partialize: (s) => ({
        dialogs: s.dialogs,
        contacts: s.contacts,
        calls: s.calls,
        lastFetchedAt: s.lastFetchedAt,
      }),
    }
  )
);
