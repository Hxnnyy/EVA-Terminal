// This page uses headers() to log the request path for debugging
export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import Link from 'next/link';

import { createLogger, resolveRequestId } from '@/lib/logger';

type HeaderList = Awaited<ReturnType<typeof headers>>;

const buildRequestId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `req-${Date.now()}`;

const resolvePathFromHeaders = (headerList: HeaderList) =>
  headerList.get('x-invoke-path') ??
  headerList.get('x-matched-path') ??
  headerList.get('x-next-url') ??
  headerList.get('next-url') ??
  headerList.get('x-forwarded-path') ??
  headerList.get('x-forwarded-uri') ??
  headerList.get('referer') ??
  'unknown';

export default async function NotFound() {
  let requestId = buildRequestId();
  let path = 'unknown';

  try {
    const headerList = await headers();
    requestId = resolveRequestId(headerList);
    path = resolvePathFromHeaders(headerList);
  } catch (error) {
    createLogger({ requestId, scope: 'app:not-found' }).warn('Failed to read request headers', {
      error,
    });
  }

  const logger = createLogger({ requestId, scope: 'app:not-found' });
  const pathKnown = path !== 'unknown';
  const isDev = process.env.NODE_ENV !== 'production';
  const isLocalRoot =
    path === '/' || path === 'http://localhost:3000/' || path === 'http://127.0.0.1:3000/';
  const shouldLogKnown = !isDev ? pathKnown : pathKnown && !isLocalRoot;

  if (!pathKnown) {
    // Next.js can render the not-found boundary in build or prefetch contexts without request
    // headers; log at info level to retain traceability without spamming warnings.
    logger.info('Route not found (path missing in request headers)', { path });
  } else if (shouldLogKnown) {
    logger.warn('Route not found', { path });
  }

  return (
    <div className="error-shell">
      <div className="admin-card admin-card--stack error-panel" role="alert" aria-live="polite">
        <p className="eyebrow">404 - Signal Lost</p>
        <h1>We can&apos;t find that resource.</h1>
        <p>
          The requested path is offline or restricted. Return to the main console or jump to the
          admin panel to verify content.
        </p>
        <p className="error-meta">
          <span className="admin-card__pill">Correlation ID</span>
          <code>{requestId}</code>
        </p>
        <div className="error-actions">
          <Link className="admin-button-accent" href="/">
            Return home
          </Link>
          <Link className="admin-button-accent" href="/admin">
            Admin console
          </Link>
        </div>
      </div>
    </div>
  );
}
