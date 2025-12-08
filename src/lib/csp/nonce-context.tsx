'use client';

import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

const CspNonceContext = createContext<string | null>(null);

type ProviderProps = PropsWithChildren<{
  nonce?: string | null;
}>;

export function CspNonceProvider({ nonce, children }: ProviderProps) {
  const value = useMemo(() => nonce ?? null, [nonce]);
  return <CspNonceContext.Provider value={value}>{children}</CspNonceContext.Provider>;
}

export function useCspNonce() {
  return useContext(CspNonceContext);
}
