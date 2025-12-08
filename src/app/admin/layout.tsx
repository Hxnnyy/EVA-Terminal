import type { ReactNode } from 'react';

import { AdminLoginModal } from '@/features/admin/components/admin-login-modal';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { AdminAuthProvider } from '@/features/admin/components/use-admin-auth';
import { metadata } from '@/features/admin/pages/layout';

export { metadata };

export default function AdminRouteLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
      <AdminLoginModal />
    </AdminAuthProvider>
  );
}
