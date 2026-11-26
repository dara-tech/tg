'use client';
import type { TelegramClient } from '@/core/telegram/client';

export class StickersService {
  constructor(private client: TelegramClient) {}

  async getAllStickers() {
    return this.client.call('messages.getAllStickers', { hash: 0n });
  }

  async getStickerSet(shortName: string) {
    return this.client.call('messages.getStickerSet', { stickerset: { _: 'inputStickerSetShortName', short_name: shortName }, hash: 0 });
  }

  async getFeaturedStickers() {
    return this.client.call('messages.getFeaturedStickers', { hash: 0n });
  }
}
