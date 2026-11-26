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
