'use client';
import type { TelegramClient } from '@/core/telegram/client';
import type { User } from '@/core/telegram/schema';

export class UsersService {
  constructor(private client: TelegramClient) {}

  async getUsers(ids: number[]): Promise<User[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.client.call as any)('users.getUsers', { id: ids.map(id => ({ _: 'inputUser', user_id: id, access_hash: 0n })) });
  }

  async getFullUser(id: number) {
    return this.client.call('users.getFullUser', { id: { _: 'inputUser', user_id: id, access_hash: 0n } });
  }

  async blockUser(id: number) {
    return this.client.call('contacts.block', { id: { _: 'inputPeerUser', user_id: id } });
  }
}
