'use client';
import type { TelegramClient } from '@/core/telegram/client';

export class ChannelsService {
  constructor(private client: TelegramClient) {}

  async getChannels(ids: number[]) {
    return this.client.call('channels.getChannels', { id: ids.map(id => ({ _: 'inputChannel', channel_id: id, access_hash: 0n })) });
  }

  async getFullChannel(channelId: number) {
    return this.client.call('channels.getFullChannel', { channel: { _: 'inputChannel', channel_id: channelId, access_hash: 0n } });
  }

  async joinChannel(channelId: number) {
    return this.client.call('channels.joinChannel', { channel: { _: 'inputChannel', channel_id: channelId, access_hash: 0n } });
  }

  async leaveChannel(channelId: number) {
    return this.client.call('channels.leaveChannel', { channel: { _: 'inputChannel', channel_id: channelId, access_hash: 0n } });
  }
}
