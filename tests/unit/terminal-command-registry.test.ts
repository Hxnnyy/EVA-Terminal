import { describe, expect, it, vi } from 'vitest';

import { createTerminalCommandRegistry } from '@/lib/terminal/command-registry';

const buildDeps = () => {
  const appendResponse = vi.fn();
  const setLastInteraction = vi.fn();
  const reelViewer = { open: vi.fn() };
  return { appendResponse, setLastInteraction, reelViewer };
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const lastTexts = (appendResponseMock: ReturnType<typeof vi.fn>) =>
  appendResponseMock.mock.calls.at(-1)?.[0].lines.map((line: { text: string }) => line.text) ?? [];

describe('terminal command registry schema parsing', () => {
  it('reports schema failure for invalid links payload', async () => {
    const deps = buildDeps();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ links: 'not-an-array' }));
    const registry = createTerminalCommandRegistry({ ...deps, fetchImpl });

    await registry[3]?.();

    expect(lastTexts(deps.appendResponse)).toContain(
      'Links payload was invalid. Verify the API response shape and retry.',
    );
    expect(deps.setLastInteraction).toHaveBeenCalledWith('Links retrieval failed');
  });

  it('accepts investments containing alphavantage source', async () => {
    const deps = buildDeps();
    const investmentPayload = {
      id: 'inv-1',
      ticker: 'ABC',
      label: 'Alpha Corp',
      order: 1,
      provider: 'alphavantage',
      providerSymbol: 'ABC',
      perf6mPercent: 4.2,
      perfLastFetched: '2025-01-01T00:00:00.000Z',
      source: 'alphavantage' as const,
    };
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ investments: [investmentPayload] }));
    const registry = createTerminalCommandRegistry({ ...deps, fetchImpl });

    await registry[6]?.();

    const interaction = deps.setLastInteraction.mock.calls.at(-1)?.[0];
    expect(interaction).toBe('Loaded 1 investment');
  });
});
