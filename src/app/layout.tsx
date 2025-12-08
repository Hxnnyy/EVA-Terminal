import '@/lib/env';
import './globals.css';

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';

import { AppErrorBoundary } from '@/components/common/app-error-boundary';
import { SkipLink } from '@/components/common/skip-link';
import { ThemeStyleTag } from '@/components/theme/theme-style-tag';
import { CspNonceProvider } from '@/lib/csp/nonce-context';
import { RequestIdProvider } from '@/lib/logger/request-id-context';

export const metadata: Metadata = {
  title: {
    template: '%s | EVA Terminal',
    default: 'EVA Terminal',
  },
  description:
    'Terminal-first portfolio experience inspired by MAGI systems. Explore work, writing, and projects.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const headerList = await headers();
  const nonce = headerList.get('x-nonce');
  const requestId = headerList.get('x-request-id');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeStyleTag nonce={nonce} />
      </head>
      <body className="antialiased theme-eoe" data-reduce-motion="false">
        <SkipLink />
        <AppErrorBoundary requestId={requestId}>
          <RequestIdProvider requestId={requestId}>
            <CspNonceProvider nonce={nonce}>
              <main id="main-content">{children}</main>
            </CspNonceProvider>
          </RequestIdProvider>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
