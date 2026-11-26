'use client';
import type { TelegramClient } from '@/core/telegram/client';

export class GroupsService {
  constructor(private client: TelegramClient) {}

  async getFullChat(chatId: number) {
    return this.client.call('messages.getFullChat', { chat_id: chatId });
  }

  async createChat(userIds: number[], title: string) {
    return this.client.call('messages.createChat', {
      users: userIds.map(id => ({ _: 'inputUser', user_id: id, access_hash: 0n })),
      title,
    });
  }

  async addChatUser(chatId: number, userId: number) {
    return this.client.call('messages.addChatUser', { chat_id: chatId, user_id: { _: 'inputUser', user_id: userId, access_hash: 0n }, fwd_limit: 100 });
  }
}
