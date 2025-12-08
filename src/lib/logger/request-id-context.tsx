'use client';

import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

const RequestIdContext = createContext<string | null>(null);

type ProviderProps = PropsWithChildren<{
  requestId?: string | null;
}>;

export function RequestIdProvider({ requestId, children }: ProviderProps) {
  const value = useMemo(() => requestId ?? null, [requestId]);
  return <RequestIdContext.Provider value={value}>{children}</RequestIdContext.Provider>;
}

export function useRequestId() {
  return useContext(RequestIdContext);
}
