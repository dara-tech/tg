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

    // Auto-heal defaultDcId if it was pointed to a DC without an authKey (e.g. from a past FILE_MIGRATE)
    if (typeof window !== 'undefined') {
      try {
        const storedDc = window.localStorage.getItem('defaultDcId');
        if (storedDc) {
          const dcNum = Number(JSON.parse(storedDc));
          if (dcNum && !window.localStorage.getItem(`${dcNum}authKey`)) {
            for (const candidate of [2, 5, 1, 4, 3]) {
              if (window.localStorage.getItem(`${candidate}authKey`)) {
                console.warn(`[MTProto] Healing corrupted defaultDcId from DC${dcNum} to DC${candidate} with valid session`);
                window.localStorage.setItem('defaultDcId', JSON.stringify(candidate));
                break;
              }
            }
          }
        }
      } catch {}
    }

    instance = new MTProto({ api_id: apiId, api_hash: apiHash });
  }
  return instance;
}

export function resetMTProtoSession(): void {
  instance = null;
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (
          k &&
          (k.includes('authKey') ||
           k.includes('serverSalt') ||
           k === 'defaultDcId' ||
           k === 'timeOffset')
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      for (let i = 1; i <= 5; i++) {
        window.localStorage.removeItem(`${i}authKey`);
        window.localStorage.removeItem(`${i}serverSalt`);
      }
      window.localStorage.removeItem('defaultDcId');
      window.localStorage.removeItem('timeOffset');
    } catch {}
  }
}

/** Typed RPC wrapper with auto DC migration and auth-key auto-recovery */
export async function call<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
  options?: { dcId?: number; syncAuth?: boolean; _retryCount?: number }
): Promise<T> {
  const mt = getMTProto();
  const { _retryCount = 0, ...mtOptions } = options ?? {};
  try {
    return (await mt.call(method, params, mtOptions)) as T;
  } catch (err: unknown) {
    const e = err as { error_code?: number; error_message?: string; message?: string };
    const errorMsg = String(e?.error_message ?? e?.message ?? err);

    // Migrate to correct DC on PHONE_MIGRATE / NETWORK_MIGRATE / USER_MIGRATE (Account DC)
    if (
      errorMsg.includes('PHONE_MIGRATE_') ||
      errorMsg.includes('NETWORK_MIGRATE_') ||
      errorMsg.includes('USER_MIGRATE_')
    ) {
      const parts = errorMsg.split('_');
      const dcId = parseInt(parts.at(-1) || '2', 10);
      if (!isNaN(dcId)) {
        await mt.setDefaultDc(dcId);
        return call<T>(method, params, { ...options, dcId });
      }
    }

    // For FILE_MIGRATE_X: query that specific file from the storage DC without changing the account's default DC!
    if (errorMsg.includes('FILE_MIGRATE_')) {
      const parts = errorMsg.split('_');
      const dcId = parseInt(parts.at(-1) || '2', 10);
      if (!isNaN(dcId) && _retryCount < 2) {
        return call<T>(method, params, { ...options, dcId, _retryCount: _retryCount + 1 });
      }
    }

    // Auto-recover from AUTH_KEY_DUPLICATED or corrupted primary session key
    // (Never clear the primary session if an error happened on a secondary file DC)
    const isAuthKeyCorrupt =
      errorMsg.includes('AUTH_KEY_DUPLICATED') ||
      (errorMsg.includes('AUTH_KEY_UNREGISTERED') && !options?.dcId) ||
      errorMsg.includes('SESSION_REVOKED') ||
      errorMsg.includes('SESSION_EXPIRED');

    if (isAuthKeyCorrupt && _retryCount < 2) {
      console.warn('[MTProto] Clearing duplicate/invalid auth key and recreating session:', errorMsg);
      resetMTProtoSession();
      return call<T>(method, params, { ...options, _retryCount: _retryCount + 1 });
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
