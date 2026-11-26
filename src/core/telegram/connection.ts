'use client';
import { encode as b64encode, decode as b64decode } from './utils/base64';

export interface MTProtoOptions {
  apiId: number;
  apiHash: string;
  dcId?: number;
  testMode?: boolean;
}

const DC_LIST: Record<number, string> = {
  1: 'wss://pluto.web.telegram.org/apiws',
  2: 'wss://venus.web.telegram.org/apiws',
  3: 'wss://aurora.web.telegram.org/apiws',
  4: 'wss://vesta.web.telegram.org/apiws',
  5: 'wss://flora.web.telegram.org/apiws',
};

const DC_TEST: Record<number, string> = {
  1: 'wss://pluto.web.telegram.org/apiws_test',
  2: 'wss://venus.web.telegram.org/apiws_test',
  3: 'wss://aurora.web.telegram.org/apiws_test',
};

export class TelegramConnection {
  private ws: WebSocket | null = null;
  private dcId: number;
  private testMode: boolean;
  private messageQueue: Uint8Array[] = [];
  private onMessage?: (data: Uint8Array) => void;
  private onOpen?: () => void;
  private onClose?: () => void;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;
  private isConnecting = false;

  constructor(dcId = 2, testMode = false) {
    this.dcId = dcId;
    this.testMode = testMode;
  }

  get url(): string {
    const map = this.testMode ? DC_TEST : DC_LIST;
    return map[this.dcId] || DC_LIST[2];
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      this.isConnecting = true;
      this.ws = new WebSocket(this.url, 'binary');
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.flushQueue();
        this.onOpen?.();
        resolve();
      };

      this.ws.onmessage = (ev) => {
        const data = new Uint8Array(ev.data as ArrayBuffer);
        this.onMessage?.(data);
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.onClose?.();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[WS] error', err);
        this.isConnecting = false;
        reject(err);
      };
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= 10) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  send(data: Uint8Array) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.messageQueue.push(data);
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      this.ws?.send(msg);
    }
  }

  setOnMessage(cb: (data: Uint8Array) => void) { this.onMessage = cb; }
  setOnOpen(cb: () => void)    { this.onOpen  = cb; }
  setOnClose(cb: () => void)   { this.onClose = cb; }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
