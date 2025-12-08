import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SegmentError } from '@/components/error-boundary/segment-error';
import { CspNonceProvider } from '@/lib/csp/nonce-context';
import { RequestIdProvider } from '@/lib/logger/request-id-context';

const renderBoundary = (props: Parameters<typeof SegmentError>[0]) =>
  render(
    <RequestIdProvider requestId="req-test">
      <CspNonceProvider nonce="nonce-123">
        <SegmentError {...props} />
      </CspNonceProvider>
    </RequestIdProvider>,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SegmentError', () => {
  it('uses the request ID from context and logs once', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderBoundary({
      error: new Error('boom'),
      reset: vi.fn(),
      scope: 'test:error',
      eyebrow: 'Fault',
      title: 'Demo',
      description: 'Test boundary',
    });

    const requestId = await screen.findByTestId('segment-error-request-id');
    expect(requestId).toHaveTextContent('req-test');

    await waitFor(() => expect(consoleSpy).toHaveBeenCalledOnce());
  });

  it('focuses the panel on mount', async () => {
    renderBoundary({
      error: new Error('focus'),
      reset: vi.fn(),
      scope: 'test:error',
      eyebrow: 'Fault',
      title: 'Focus',
      description: 'Ensure focus',
    });

    const panel = screen.getByTestId('segment-error-panel');
    await waitFor(() => expect(panel).toHaveFocus());
  });

  it('triggers reset and reload handlers', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();

    const originalLocation = window.location;
    const reload = vi.fn();
    const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload },
      configurable: true,
    });

    renderBoundary({
      error: new Error('actions'),
      reset,
      scope: 'test:error',
      eyebrow: 'Fault',
      title: 'Actions',
      description: 'Ensure actions',
    });

    await user.click(screen.getByTestId('segment-error-reset'));
    expect(reset).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId('segment-error-reload'));
    expect(reload).toHaveBeenCalledTimes(1);

    if (locationDescriptor) {
      Object.defineProperty(window, 'location', locationDescriptor);
    } else {
      Object.defineProperty(window, 'location', { value: originalLocation });
    }
  });
});
