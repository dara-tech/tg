'use client';
import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME   = 'telegram-web-db';
export const DB_VERSION = 3;

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('sessions', { keyPath: 'dcId' });
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('peer_date', ['peer_id', 'date']);
        db.createObjectStore('dialogs', { keyPath: 'id' });
        db.createObjectStore('users',   { keyPath: 'id' });
        db.createObjectStore('chats',   { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        db.createObjectStore('media', { keyPath: 'id' });
      }
      if (oldVersion < 3) {
        db.createObjectStore('drafts', { keyPath: 'peerId' });
      }
    },
  });
}
