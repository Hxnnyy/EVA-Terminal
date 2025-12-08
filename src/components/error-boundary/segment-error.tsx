'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';

import { useCspNonce } from '@/lib/csp/nonce-context';
import { createLogger } from '@/lib/logger';
import { useRequestId } from '@/lib/logger/request-id-context';

type SegmentErrorAction =
  | { kind: 'reset'; label: string }
  | { kind: 'reload'; label: string }
  | { kind: 'link'; label: string; href: string };

type SegmentErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  eyebrow: string;
  title: string;
  description: string;
  scope: string;
  actions?: SegmentErrorAction[];
};

const FALLBACK_REQUEST_ID = 'req-unknown';

const defaultActions: SegmentErrorAction[] = [
  { kind: 'reset', label: 'Retry view' },
  { kind: 'reload', label: 'Reload page' },
  { kind: 'link', label: 'Return home', href: '/' },
  { kind: 'link', label: 'Admin console', href: '/admin' },
];

const buildCorrelationId = (requestIdFromContext: string | null, digest?: string) => {
  if (requestIdFromContext) {
    return requestIdFromContext;
  }
  if (digest) {
    return digest;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return FALLBACK_REQUEST_ID;
};

export function SegmentError({
  error,
  reset,
  eyebrow,
  title,
  description,
  scope,
  actions = defaultActions,
}: SegmentErrorProps) {
  const requestIdFromContext = useRequestId();
  const correlationIdRef = useRef<string | null>(null);
  const focusRef = useRef<HTMLDivElement | null>(null);
  const nonce = useCspNonce();

  const correlationId = useMemo(() => {
    if (!correlationIdRef.current) {
      correlationIdRef.current = buildCorrelationId(requestIdFromContext, error.digest);
    }
    return correlationIdRef.current;
  }, [error.digest, requestIdFromContext]);

  const path = useMemo(
    () => (typeof window !== 'undefined' ? window.location.pathname : 'unknown'),
    [],
  );

  useEffect(() => {
    focusRef.current?.focus();
  }, []);

  useEffect(() => {
    const logger = createLogger({ requestId: correlationId, scope });
    logger.error('Segment boundary captured runtime error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      path,
    });
  }, [correlationId, error.digest, error.message, error.stack, path, scope]);

  const resolvedActions = actions.length ? actions : defaultActions;

  const handleAction = (action: SegmentErrorAction) => {
    if (action.kind === 'reset') {
      reset();
    } else if (action.kind === 'reload') {
      if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
        window.location.reload();
      } else {
        reset();
      }
    }
  };

  return (
    <div className="error-shell" data-testid="segment-error-shell">
      {/* SECURITY: Safe usage — CSS is a static string literal.
          Content is hardcoded, not user-provided. Nonce protects from injection. */}
      <style
        nonce={nonce ?? undefined}
        dangerouslySetInnerHTML={{
          __html: `
          .error-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .error-panel:focus-visible {
            outline: 2px solid var(--accent, #e11d48);
            outline-offset: 6px;
          }

          @media (max-width: 640px) {
            .error-actions {
              flex-direction: column;
              align-items: stretch;
            }
          }
        `,
        }}
      />
      <div
        ref={focusRef}
        className="admin-card admin-card--warning admin-card--stack error-panel"
        role="alert"
        aria-live="assertive"
        tabIndex={-1}
        data-testid="segment-error-panel"
      >
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <p className="error-meta">
          <span className="admin-card__pill">Request ID</span>
          <code data-testid="segment-error-request-id">{correlationId}</code>
        </p>
        <div className="error-actions">
          {resolvedActions.map((action) => {
            if (action.kind === 'link') {
              return (
                <Link
                  key={`${action.kind}-${action.href}-${action.label}`}
                  className="admin-button-accent"
                  href={action.href}
                  data-testid={`segment-error-link-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {action.label}
                </Link>
              );
            }

            const onClick =
              action.kind === 'reset'
                ? () => handleAction(action)
                : action.kind === 'reload'
                  ? () => handleAction(action)
                  : undefined;

            return (
              <button
                key={`${action.kind}-${action.label}`}
                type="button"
                className="admin-button-accent"
                onClick={onClick}
                data-testid={`segment-error-${action.kind}`}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
