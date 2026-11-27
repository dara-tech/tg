'use client';
import { getDB } from './database';
import type { Message } from '../telegram/schema';

export async function saveMessage(msg: Message) {
  const db = await getDB();
  await db.put('messages', msg);
}

export async function getMessages(peerId: string, limit = 50, offsetId = 0): Promise<Message[]> {
  const db = await getDB();
  const all: Message[] = await db.getAll('messages');
  return all
    .filter(m => JSON.stringify(m.peer_id) === peerId && (!offsetId || m.id < offsetId))
    .sort((a, b) => b.date - a.date)
    .slice(0, limit)
    .reverse();
}

export async function deleteMessage(id: number) {
  const db = await getDB();
  await db.delete('messages', id);
}

export async function saveDraft(peerId: string, text: string) {
  const db = await getDB();
  await db.put('drafts', { peerId, text, date: Date.now() });
}

export async function getDraft(peerId: string): Promise<string> {
  const db = await getDB();
  const draft = await db.get('drafts', peerId);
  return draft?.text ?? '';
}

import { type RealMessageItem, toUint8Array } from '@/services/telegram.real';

const conversationMessagesCache = new Map<string, RealMessageItem[]>();
const MSG_STORAGE_KEY = 'tg-msg-cache-v1';

export function getCachedMessages(id: string): RealMessageItem[] {
  const mem = conversationMessagesCache.get(id);
  if (mem && mem.length > 0) return mem;
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MSG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, RealMessageItem[]>;
    const stored = parsed?.[id];
    if (Array.isArray(stored) && stored.length > 0) {
      const normalized = stored.map((m) => ({
        ...m,
        media: m.media
          ? {
              ...m.media,
              fileReference: m.media.fileReference
                ? toUint8Array(m.media.fileReference)
                : undefined,
            }
          : undefined,
      }));
      conversationMessagesCache.set(id, normalized);
      return normalized;
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function setCachedMessages(id: string, msgs: RealMessageItem[]) {
  conversationMessagesCache.set(id, msgs);
  if (typeof window === 'undefined' || msgs.length === 0) return;
  try {
    const raw = window.localStorage.getItem(MSG_STORAGE_KEY);
    const parsed: Record<string, RealMessageItem[]> = raw ? JSON.parse(raw) : {};
    // Keep only the latest 10 messages per chat and at most 20 chats in localStorage
    const tail = msgs.slice(-10).map((m) => ({
      ...m,
      media: m.media ? { ...m.media, localUrl: undefined } : undefined,
    }));
    parsed[id] = tail;
    const keys = Object.keys(parsed);
    if (keys.length > 20) {
      delete parsed[keys[0]];
    }
    window.localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage quota errors
  }
}
