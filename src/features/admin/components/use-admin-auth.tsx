'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';

type AdminAuthContextValue = {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  status: 'idle' | 'loading' | 'error' | 'success';
  error: string | null;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<AdminAuthContextValue['status']>('idle');
  const [error, setError] = useState<string | null>(null);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setStatus('idle');
    setError(null);
  }, []);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setStatus('loading');
      setError(null);
      try {
        console.log('[AdminAuth] Creating browser client...');
        const supabase = createSupabaseBrowserClient();
        console.log('[AdminAuth] Attempting signInWithPassword...');
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          console.error('[AdminAuth] Supabase returned error:', signInError);
          throw signInError;
        }
        console.log('[AdminAuth] Sign in successful!');
        setStatus('success');
        setTimeout(() => closeModal(), 800);
      } catch (err) {
        console.error('[AdminAuth] Sign in failed:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unable to sign in. Try again.');
      }
    },
    [closeModal],
  );

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      isModalOpen,
      openModal,
      closeModal,
      signIn,
      status,
      error,
    }),
    [isModalOpen, openModal, closeModal, signIn, status, error],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}
