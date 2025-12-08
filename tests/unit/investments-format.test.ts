import { describe, expect, it } from 'vitest';

import { buildInvestmentsLines } from '@/lib/terminal/commands/investments';

describe('buildInvestmentsLines', () => {
  it('renders rows for investments with percent', () => {
    const lines = buildInvestmentsLines([
      {
        ticker: 'AAPL',
        label: 'Apple',
        perf6mPercent: 12.4,
        perfLastFetched: '2025-11-10T00:00:00Z',
        source: 'cache',
      },
    ]);

    const text = lines.map((line) => line.text);
    expect(text[0]).toBe('RETRIEVING INVESTMENTS MODULE:');
    expect(text[1]).toContain('Last sync');
    expect(text[2]).toContain('AAPL');
    expect(text[3]).toContain('6M:');
  });

  it('shows empty messaging when list is empty', () => {
    const lines = buildInvestmentsLines([]);
    expect(lines[0]?.text).toBe('RETRIEVING INVESTMENTS MODULE:');
    expect(lines[1]?.text).toContain('Last sync');
  });
});
