'use client';
import type { TelegramClient } from '@/core/telegram/client';

export class StoriesService {
  constructor(private client: TelegramClient) {}

  async getAllStories() {
    return this.client.call('stories.getAllStories', { next: false, hidden: false, next_offset: '' });
  }

  async getPeerStories(peer: unknown) {
    return this.client.call('stories.getPeerStories', { peer });
  }

  async sendStory(peer: unknown, media: unknown, caption = '') {
    return this.client.call('stories.sendStory', { peer, media, caption: [{ _: 'messageEntityBold', offset: 0, length: 0 }], privacy_rules: [{ _: 'inputPrivacyValueAllowAll' }], random_id: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) });
  }
}
