'use client';
import type { TelegramClient } from '@/core/telegram/client';

export class ReactionsService {
  constructor(private client: TelegramClient) {}

  async sendReaction(peer: unknown, msgId: number, reaction: string) {
    return this.client.call('messages.sendReaction', {
      peer,
      msg_id: msgId,
      reaction: [{ _: 'reactionEmoji', emoticon: reaction }],
    });
  }

  async getMessageReactions(peer: unknown, id: number[]) {
    return this.client.call('messages.getMessageReactionsList', { peer, id: id[0], limit: 100 });
  }

  async getAvailableReactions() {
    return this.client.call('messages.getAvailableReactions', { hash: 0 });
  }
}
