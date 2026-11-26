'use client';
import type { TelegramClient } from '@/core/telegram/client';

export class SettingsService {
  constructor(private client: TelegramClient) {}

  async getAccountPrivacy() {
    return this.client.call('account.getPrivacy', { key: { _: 'inputPrivacyKeyStatusTimestamp' } });
  }

  async setAccountPrivacy(key: string, rules: unknown[]) {
    return this.client.call('account.setPrivacy', { key: { _: key }, rules });
  }

  async updateProfile(firstName: string, lastName: string, about: string) {
    return this.client.call('account.updateProfile', { first_name: firstName, last_name: lastName, about });
  }

  async updateUsername(username: string) {
    return this.client.call('account.updateUsername', { username });
  }

  async getNotifySettings(peer: unknown) {
    return this.client.call('account.getNotifySettings', { peer });
  }

  async updateNotifySettings(peer: unknown, settings: unknown) {
    return this.client.call('account.updateNotifySettings', { peer, settings });
  }

  async deleteAccount(reason: string) {
    return this.client.call('account.deleteAccount', { reason });
  }
}
