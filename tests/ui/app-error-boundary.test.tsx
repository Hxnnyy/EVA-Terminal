import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from '@/components/common/app-error-boundary';

function Thrower({ explode }: { explode: boolean }) {
  if (explode) {
    throw new Error('boom');
  }
  return <div>Stable output</div>;
}

function BoundaryHarness() {
  const [explode, setExplode] = useState(true);

  return (
    <AppErrorBoundary requestId="req-test" onReset={() => setExplode(false)}>
      <Thrower explode={explode} />
    </AppErrorBoundary>
  );
}

describe('AppErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders fallback UI and recovers on retry', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    render(<BoundaryHarness />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('req-test')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Stable output')).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();
  });
});
