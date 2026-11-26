declare module '@mtproto/core/envs/browser' {
  interface MTProtoOptions {
    api_id: number;
    api_hash: string;
    test?: boolean;
  }

  class MTProto {
    constructor(options: MTProtoOptions);
    call(method: string, params?: Record<string, unknown>, options?: { dcId?: number; syncAuth?: boolean }): Promise<unknown>;
    updates: {
      on(event: string, cb: (data: { type?: string; payload?: unknown; updates?: Array<{ _: string }>; update?: { _: string } }) => void): void;
      off?(event: string, cb: (...args: unknown[]) => void): void;
    };
    crypto: {
      getSRPParams(params: {
        g: number;
        p: Uint8Array;
        salt1: Uint8Array;
        salt2: Uint8Array;
        gB: Uint8Array;
        password: string;
      }): Promise<{ A: Uint8Array; M1: Uint8Array }>;
    };
    setDefaultDc(dcId: number): Promise<void>;
  }

  export default MTProto;
}
