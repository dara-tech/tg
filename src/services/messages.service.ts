'use client';
import type { TelegramClient } from '@/core/telegram/client';
import type { Message } from '@/core/telegram/schema';

export class MessagesService {
  constructor(private client: TelegramClient) {}

  async getHistory(peer: { _: string; [k: string]: unknown }, limit = 30, offsetId = 0) {
    return this.client.call('messages.getHistory', { peer, limit, offset_id: offsetId, offset_date: 0, add_offset: 0, max_id: 0, min_id: 0, hash: 0n });
  }

  async sendMessage(peer: { _: string; [k: string]: unknown }, message: string, replyToMsgId?: number): Promise<Message> {
    return this.client.call<Message>('messages.sendMessage', {
      peer,
      message,
      random_id: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
      ...(replyToMsgId ? { reply_to_msg_id: replyToMsgId } : {}),
    });
  }

  async deleteMessages(ids: number[], revoke = true) {
    return this.client.call('messages.deleteMessages', { id: ids, revoke });
  }

  async readHistory(peer: { _: string; [k: string]: unknown }, maxId: number) {
    return this.client.call('messages.readHistory', { peer, max_id: maxId });
  }

  async searchMessages(peer: { _: string; [k: string]: unknown }, query: string, limit = 20) {
    return this.client.call('messages.search', { peer, q: query, limit, filter: { _: 'inputMessagesFilterEmpty' }, min_date: 0, max_date: 0, offset_id: 0, add_offset: 0, max_id: 0, min_id: 0, hash: 0n });
  }

  async forwardMessages(fromPeer: unknown, toPeer: unknown, ids: number[]) {
    return this.client.call('messages.forwardMessages', { from_peer: fromPeer, to_peer: toPeer, id: ids, random_id: ids.map(() => BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))) });
  }
}
