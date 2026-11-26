import { create } from 'zustand';
import type { Message } from '@/core/telegram/schema';

interface MessagesState {
  byPeer: Map<string, Message[]>;
  loadingPeers: Set<string>;
  setMessages: (peerId: string, msgs: Message[]) => void;
  prependMessages: (peerId: string, msgs: Message[]) => void;
  appendMessage: (peerId: string, msg: Message) => void;
  removeMessage: (peerId: string, id: number) => void;
  setLoading: (peerId: string, v: boolean) => void;
}

export const useMessagesStore = create<MessagesState>((set) => ({
  byPeer: new Map(),
  loadingPeers: new Set(),
  setMessages: (peerId, msgs) => set(s => { const m = new Map(s.byPeer); m.set(peerId, msgs); return { byPeer: m }; }),
  prependMessages: (peerId, msgs) => set(s => { const m = new Map(s.byPeer); m.set(peerId, [...msgs, ...(m.get(peerId) ?? [])]); return { byPeer: m }; }),
  appendMessage: (peerId, msg) => set(s => { const m = new Map(s.byPeer); const prev = m.get(peerId) ?? []; m.set(peerId, [...prev, msg]); return { byPeer: m }; }),
  removeMessage: (peerId, id) => set(s => { const m = new Map(s.byPeer); m.set(peerId, (m.get(peerId) ?? []).filter(x => x.id !== id)); return { byPeer: m }; }),
  setLoading: (peerId, v) => set(s => { const ls = new Set(s.loadingPeers); v ? ls.add(peerId) : ls.delete(peerId); return { loadingPeers: ls }; }),
}));
