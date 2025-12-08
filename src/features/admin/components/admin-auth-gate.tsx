'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAdminAuth } from '@/features/admin/components/use-admin-auth';

type AdminAuthGateProps = {
  message?: string;
  autoOpen?: boolean;
};

export function AdminAuthGate({ autoOpen = true }: AdminAuthGateProps) {
  const { openModal, status } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (autoOpen) {
      openModal();
    }
  }, [autoOpen, openModal]);

  useEffect(() => {
    if (status === 'success') {
      const refresh = window.setTimeout(() => {
        router.refresh();
      }, 300);
      return () => window.clearTimeout(refresh);
    }
    return undefined;
  }, [router, status]);

  return (
    <section className="admin-auth-gate-centered" role="alert" aria-live="polite">
      <h2>Sign in required</h2>
      <button className="admin-button-accent" onClick={openModal}>
        Open admin login
      </button>
    </section>
  );
}
