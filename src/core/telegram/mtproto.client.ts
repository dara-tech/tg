'use client';
// Real MTProto client backed by @mtproto/core
// Docs: https://github.com/alik0211/mtproto-core

import MTProto from '@mtproto/core/envs/browser';

let instance: MTProto | null = null;

export function getMTProto(): MTProto {
  if (!instance) {
    const apiId   = parseInt(process.env.NEXT_PUBLIC_API_ID  ?? '0', 10);
    const apiHash = process.env.NEXT_PUBLIC_API_HASH ?? '';

    if (!apiId || !apiHash) {
      throw new Error(
        'Missing NEXT_PUBLIC_API_ID or NEXT_PUBLIC_API_HASH. ' +
        'Create them at https://my.telegram.org/apps and add to .env.local'
      );
    }

    instance = new MTProto({ api_id: apiId, api_hash: apiHash });
  }
  return instance;
}

export function resetMTProtoSession(): void {
  instance = null;
  if (typeof window !== 'undefined') {
    try {
      for (let i = 1; i <= 5; i++) {
        window.localStorage.removeItem(`${i}authKey`);
        window.localStorage.removeItem(`${i}serverSalt`);
      }
      window.localStorage.removeItem('defaultDcId');
      window.localStorage.removeItem('timeOffset');
    } catch {}
  }
}

/** Typed RPC wrapper with auto DC migration */
export async function call<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
  options?: { dcId?: number; syncAuth?: boolean }
): Promise<T> {
  const mt = getMTProto();
  try {
    return (await mt.call(method, params, options)) as T;
  } catch (err: unknown) {
    const e = err as { error_code?: number; error_message?: string };
    // Migrate to correct DC on PHONE_MIGRATE / NETWORK_MIGRATE / USER_MIGRATE
    if (e?.error_message?.includes('_MIGRATE_')) {
      const dcId = parseInt(e.error_message!.split('_').at(-1)!, 10);
      await mt.setDefaultDc(dcId);
      return (await mt.call(method, params, { dcId })) as T;
    }

    // Auto-recover from AUTH_KEY_DUPLICATED or corrupted session key
    if (
      e?.error_message === 'AUTH_KEY_DUPLICATED' ||
      e?.error_message === 'AUTH_KEY_UNREGISTERED' ||
      e?.error_message === 'SESSION_REVOKED' ||
      e?.error_message === 'SESSION_EXPIRED'
    ) {
      console.warn('[MTProto] Clearing duplicate/invalid auth key and recreating session:', e.error_message);
      resetMTProtoSession();
      const freshMt = getMTProto();
      return (await freshMt.call(method, params, options)) as T;
    }

    throw err;
  }
}

export interface NormalizedMTProtoEvent {
  type?: string;
  payload?: unknown;
  updates?: Array<{ _: string; [key: string]: unknown }>;
  update?: { _: string; [key: string]: unknown };
}

/** Update listener with cleanup; normalizes updateShortMessage & updateShortChatMessage */
export function onMTProtoUpdate(cb: (event: NormalizedMTProtoEvent) => void): () => void {
  const mt = getMTProto();

  const onUpdates = (...args: unknown[]) => {
    const ev = (args[0] ?? {}) as NormalizedMTProtoEvent;
    cb(ev);
  };
  const onShortMessage = (...args: unknown[]) => {
    const ev = (args[0] ?? {}) as { id?: number; user_id?: string | number; message?: string; date?: number; out?: boolean };
    if (!ev.id || !ev.user_id) return;
    cb({
      type: 'updateShortMessage',
      updates: [{
        _: 'updateNewMessage',
        message: {
          id: ev.id,
          message: ev.message ?? '',
          date: ev.date ?? Math.floor(Date.now() / 1000),
          out: Boolean(ev.out),
          peer_id: { user_id: ev.user_id },
        },
      }],
    });
  };
  const onShortChatMessage = (...args: unknown[]) => {
    const ev = (args[0] ?? {}) as { id?: number; chat_id?: string | number; message?: string; date?: number; out?: boolean };
    if (!ev.id || !ev.chat_id) return;
    cb({
      type: 'updateShortChatMessage',
      updates: [{
        _: 'updateNewMessage',
        message: {
          id: ev.id,
          message: ev.message ?? '',
          date: ev.date ?? Math.floor(Date.now() / 1000),
          out: Boolean(ev.out),
          peer_id: { chat_id: ev.chat_id },
        },
      }],
    });
  };

  mt.updates.on('updates', onUpdates);
  mt.updates.on('updatesCombined', onUpdates);
  mt.updates.on('updateShort', onUpdates);
  mt.updates.on('updateShortMessage', onShortMessage);
  mt.updates.on('updateShortChatMessage', onShortChatMessage);

  return () => {
    mt.updates.off?.('updates', onUpdates);
    mt.updates.off?.('updatesCombined', onUpdates);
    mt.updates.off?.('updateShort', onUpdates);
    mt.updates.off?.('updateShortMessage', onShortMessage);
    mt.updates.off?.('updateShortChatMessage', onShortChatMessage);
  };
}
