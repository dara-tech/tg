'use client';
import { TelegramConnection, type MTProtoOptions } from './connection';
import { createAuthKey, generateSessionId, generateMessageId, type AuthKeys } from './authorization';
import { TLSerializer, TLDeserializer } from './tl';
import type { TLObject } from './schema';

export class TelegramClient {
  private conn: TelegramConnection;
  private opts: MTProtoOptions;
  private authKeys: AuthKeys | null = null;
  private sessionId: bigint = generateSessionId();
  private seqNo = 0;
  private pendingRpc = new Map<bigint, { resolve: (v: TLObject) => void; reject: (e: Error) => void }>();

  constructor(opts: MTProtoOptions) {
    this.opts = opts;
    this.conn = new TelegramConnection(opts.dcId ?? 2, opts.testMode ?? false);
    this.conn.setOnMessage(this.handleMessage.bind(this));
  }

  async connect() {
    await this.conn.connect();
    if (!this.authKeys) {
      this.authKeys = await createAuthKey();
    }
  }

  async call<T extends TLObject>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.authKeys) await this.connect();
    const msgId = generateMessageId();
    const seqNo = this.seqNo++ * 2 + 1;

    const body = TLSerializer.serialize(method, params);
    const payload = this.wrapMTPMessage(msgId, seqNo, body);
    this.conn.send(payload);

    return new Promise<T>((resolve, reject) => {
      this.pendingRpc.set(msgId, { resolve: resolve as (v: TLObject) => void, reject });
      setTimeout(() => {
        if (this.pendingRpc.has(msgId)) {
          this.pendingRpc.delete(msgId);
          reject(new Error(`RPC timeout: ${method}`));
        }
      }, 30000);
    });
  }

  private wrapMTPMessage(msgId: bigint, seqNo: number, body: Uint8Array): Uint8Array {
    // Minimal unencrypted message wrapper (for demonstration)
    const buf = new Uint8Array(8 + 8 + 4 + body.length);
    const dv = new DataView(buf.buffer);
    dv.setBigInt64(0, 0n, true);       // auth_key_id = 0 (unencrypted)
    dv.setBigInt64(8, msgId, true);    // message_id
    dv.setUint32(16, body.length, true); // message_length
    buf.set(body, 20);
    return buf;
  }

  private handleMessage(data: Uint8Array) {
    try {
      const dv = new DataView(data.buffer);
      const msgId = dv.getBigInt64(8, true);
      const bodyLen = dv.getUint32(16, true);
      const body = data.slice(20, 20 + bodyLen);
      const result = TLDeserializer.deserialize(body) as unknown as TLObject;
      const pending = this.pendingRpc.get(msgId);
      if (pending) {
        this.pendingRpc.delete(msgId);
        pending.resolve(result);
      }
    } catch (e) {
      console.error('[Client] handleMessage error', e);
    }
  }

  disconnect() { this.conn.disconnect(); }
}
