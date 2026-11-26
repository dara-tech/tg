'use client';
import { call, getMTProto } from '@/core/telegram/mtproto.client';

const API_ID   = parseInt(process.env.NEXT_PUBLIC_API_ID  ?? '0', 10);
const API_HASH = process.env.NEXT_PUBLIC_API_HASH ?? '';

export interface SentCode {
  phone_code_hash: string;
  type: { _: string; length?: number };
  next_type?: { _: string };
  timeout?: number;
}

export interface AuthResult {
  _: string;
  user?: unknown;
}

export async function sendCode(phone: string): Promise<SentCode> {
  return call<SentCode>('auth.sendCode', {
    phone_number:  phone,
    api_id:        API_ID,
    api_hash:      API_HASH,
    settings:      { _: 'codeSettings' },
  });
}

export async function signIn(
  phone: string,
  phoneCodeHash: string,
  code: string
): Promise<AuthResult> {
  return call<AuthResult>('auth.signIn', {
    phone_number:    phone,
    phone_code_hash: phoneCodeHash,
    phone_code:      code,
  });
}

export async function checkPassword(passwordSrp: unknown): Promise<AuthResult> {
  return call<AuthResult>('auth.checkPassword', { password: passwordSrp });
}

interface AccountPassword {
  srp_id: string;
  srp_B: Uint8Array;
  hint?: string;
  current_algo: {
    _: string;
    g: number;
    p: Uint8Array;
    salt1: Uint8Array;
    salt2: Uint8Array;
  };
}

export async function getPasswordInfo(): Promise<AccountPassword> {
  return call<AccountPassword>('account.getPassword');
}

export async function signInWithPassword(password: string): Promise<AuthResult> {
  const pwd = await getPasswordInfo();
  const { g, p, salt1, salt2 } = pwd.current_algo;
  const { A, M1 } = await getMTProto().crypto.getSRPParams({
    g,
    p,
    salt1,
    salt2,
    gB: pwd.srp_B,
    password,
  });
  return checkPassword({
    _: 'inputCheckPasswordSRP',
    srp_id: pwd.srp_id,
    A,
    M1,
  });
}

export async function logOut(): Promise<void> {
  await call('auth.logOut');
}

export interface Me {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  phone?: string;
}

export async function getMe(): Promise<Me> {
  const r = await call<{ user: Me }>('users.getFullUser', {
    id: { _: 'inputUserSelf' },
  });
  return r.user;
}

export type LoginTokenResult =
  | { _: 'auth.loginToken'; expires: number; token: Uint8Array }
  | { _: 'auth.loginTokenMigrateTo'; dc_id: number; token: Uint8Array }
  | { _: 'auth.loginTokenSuccess'; authorization: AuthResult };

export function toBase64Url(bytes: Uint8Array): string {
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function exportLoginToken(exceptIds: number[] = []): Promise<LoginTokenResult> {
  return call<LoginTokenResult>('auth.exportLoginToken', {
    api_id: API_ID,
    api_hash: API_HASH,
    except_ids: exceptIds,
  });
}

export async function importLoginToken(token: Uint8Array): Promise<LoginTokenResult> {
  return call<LoginTokenResult>('auth.importLoginToken', { token });
}

export async function acceptLoginToken(token: Uint8Array): Promise<unknown> {
  return call('auth.acceptLoginToken', { token });
}
