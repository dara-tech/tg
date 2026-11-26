'use client';
import { createContext, useContext } from 'react';

interface MTProtoCtx { ready: boolean; }
const Ctx = createContext<MTProtoCtx>({ ready: true });

export function useMTProto() { return useContext(Ctx); }

export function MTProtoProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={{ ready: true }}>{children}</Ctx.Provider>;
}
