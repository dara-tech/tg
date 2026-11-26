'use client';
import type { TelegramClient } from '@/core/telegram/client';

export class CallsService {
  constructor(private client: TelegramClient) {}

  async requestCall(userId: number) {
    const gAHash = crypto.getRandomValues(new Uint8Array(32));
    return this.client.call('phone.requestCall', {
      user_id: { _: 'inputUser', user_id: userId, access_hash: 0n },
      random_id: Math.floor(Math.random() * 2 ** 31),
      g_a_hash: gAHash,
      protocol: { _: 'phoneCallProtocol', udp_p2p: true, udp_reflector: true, min_layer: 92, max_layer: 92, library_versions: ['5.0.0'] },
    });
  }

  async acceptCall(callId: number, accessHash: bigint) {
    const gB = crypto.getRandomValues(new Uint8Array(256));
    return this.client.call('phone.acceptCall', {
      peer: { _: 'inputPhoneCall', id: callId, access_hash: accessHash },
      g_b: gB,
      protocol: { _: 'phoneCallProtocol', udp_p2p: true, udp_reflector: true, min_layer: 92, max_layer: 92, library_versions: ['5.0.0'] },
    });
  }

  async discardCall(callId: number, accessHash: bigint) {
    return this.client.call('phone.discardCall', {
      peer: { _: 'inputPhoneCall', id: callId, access_hash: accessHash },
      duration: 0,
      reason: { _: 'phoneCallDiscardReasonHangup' },
      connection_id: 0n,
    });
  }
}
