'use client';
import type { TelegramClient } from '@/core/telegram/client';
import type { DialogsResult } from '@/core/telegram/schema';

export class DialogsService {
  constructor(private client: TelegramClient) {}

  async getDialogs(limit = 20, offsetDate = 0, offsetId = 0): Promise<DialogsResult> {
    return this.client.call<DialogsResult>('messages.getDialogs', {
      offset_date: offsetDate,
      offset_id: offsetId,
      offset_peer: { _: 'inputPeerEmpty' },
      limit,
      hash: 0n,
    });
  }
}
