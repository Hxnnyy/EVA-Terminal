'use client';

import { PropsWithChildren } from 'react';

import { AdminLoginModal } from '@/features/admin/components/admin-login-modal';
import { AdminAuthProvider } from '@/features/admin/components/use-admin-auth';
import { ReelViewerProvider } from '@/features/terminal/hooks/use-reel-viewer';
import { ThemeProvider } from '@/lib/theme/theme-provider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <ReelViewerProvider>
          {children}
          <AdminLoginModal />
        </ReelViewerProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
