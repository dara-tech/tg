'use client';
import type { TelegramClient } from '@/core/telegram/client';
import type { AuthSentCode, AuthAuthorization, User } from '@/core/telegram/schema';

export class AuthService {
  constructor(private client: TelegramClient) {}

  async sendCode(phoneNumber: string): Promise<AuthSentCode> {
    return this.client.call<AuthSentCode>('auth.sendCode', {
      phone_number: phoneNumber,
      api_id: parseInt(process.env.NEXT_PUBLIC_API_ID ?? '0'),
      api_hash: process.env.NEXT_PUBLIC_API_HASH ?? '',
      settings: { _: 'codeSettings' },
    });
  }

  async signIn(phoneNumber: string, phoneCodeHash: string, phoneCode: string): Promise<AuthAuthorization> {
    return this.client.call<AuthAuthorization>('auth.signIn', {
      phone_number: phoneNumber,
      phone_code_hash: phoneCodeHash,
      phone_code: phoneCode,
    });
  }

  async signInWithPassword(password: string): Promise<AuthAuthorization> {
    // SRP-based 2FA
    return this.client.call<AuthAuthorization>('auth.checkPassword', {
      password: { _: 'inputCheckPasswordSRP', srpId: 0n, A: new Uint8Array(), M1: new Uint8Array() },
    });
  }

  async logOut(): Promise<void> {
    await this.client.call('auth.logOut');
  }

  async getMe(): Promise<User> {
    return this.client.call<User>('users.getFullUser', { id: { _: 'inputUserSelf' } });
  }
}
