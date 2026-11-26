'use client';
import type { TelegramClient } from '@/core/telegram/client';

export class ContactsService {
  constructor(private client: TelegramClient) {}

  async getContacts() {
    return this.client.call('contacts.getContacts', { hash: 0n });
  }

  async importContacts(contacts: { phone: string; first_name: string; last_name: string }[]) {
    return this.client.call('contacts.importContacts', { contacts: contacts.map((c, i) => ({ ...c, client_id: i })) });
  }

  async deleteContacts(ids: number[]) {
    return this.client.call('contacts.deleteContacts', { id: ids.map(id => ({ _: 'inputUser', user_id: id })) });
  }
}
