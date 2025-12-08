'use client';

import { useRouter } from 'next/navigation';
import React, { Component, type ErrorInfo, type ReactNode, useCallback } from 'react';

import { createLogger } from '@/lib/logger';

type AppErrorBoundaryProps = {
  children: ReactNode;
  requestId?: string | null;
  onReset?: () => void;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error?: Error | null;
  correlationId?: string;
  resetKey: number;
};

const FALLBACK_REQUEST_ID = 'req-unknown';

type AppErrorBoundaryInnerProps = AppErrorBoundaryProps & {
  onReset: () => void;
};

class AppErrorBoundaryInner extends Component<AppErrorBoundaryInnerProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryInnerProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      correlationId: props.requestId ?? undefined,
      resetKey: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const correlationId =
      this.state.correlationId ?? this.props.requestId ?? this.buildCorrelationId(error);

    if (this.state.correlationId !== correlationId) {
      this.setState({ correlationId });
    }

    const logger = createLogger({ requestId: correlationId, scope: 'client:error-boundary' });
    logger.error('Client UI crashed; rendering fallback', {
      message: error?.message,
      stack: error?.stack,
      componentStack: info?.componentStack,
    });
  }

  private handleReset = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      correlationId: this.props.requestId ?? undefined,
      resetKey: prev.resetKey + 1,
    }));
    this.props.onReset();
  };

  private buildCorrelationId(error?: unknown): string {
    if (this.props.requestId) {
      return this.props.requestId;
    }

    if (error && typeof error === 'object' && 'digest' in error) {
      const digest = (error as { digest?: string }).digest;
      if (digest) {
        return digest;
      }
    }

    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return FALLBACK_REQUEST_ID;
  }

  render() {
    const correlationId = this.state.correlationId ?? this.props.requestId ?? FALLBACK_REQUEST_ID;

    if (this.state.hasError) {
      return (
        <div className="error-shell">
          <div
            className="admin-card admin-card--warning admin-card--stack error-panel"
            role="alert"
            aria-live="assertive"
          >
            <p className="eyebrow">Client Render Fault</p>
            <h1>We hit an error while rendering the console.</h1>
            <p>
              The terminal UI crashed, but we captured the details below. Retry to reset this view
              without leaving the page.
            </p>
            <p className="error-meta">
              <span className="admin-card__pill">Request ID</span>
              <code>{correlationId}</code>
            </p>
            <div className="error-actions">
              <button type="button" className="admin-button-accent" onClick={this.handleReset}>
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

export function AppErrorBoundary({ children, onReset, requestId }: AppErrorBoundaryProps) {
  const router = useRouter();

  const handleReset = useCallback(() => {
    if (onReset) {
      onReset();
    } else {
      router.refresh();
    }
  }, [onReset, router]);

  return (
    <AppErrorBoundaryInner requestId={requestId} onReset={handleReset}>
      {children}
    </AppErrorBoundaryInner>
  );
}
