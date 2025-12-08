import type { TerminalLineKind } from '@/lib/terminal/use-typewriter';

export type InvestmentEntry = {
  ticker: string;
  label: string | null;
  perf6mPercent: number | null;
  perfLastFetched: string | null;
  source: 'cache' | 'stooq' | 'alphavantage' | 'missing';
};

type Line = {
  text: string;
  kind?: TerminalLineKind;
  segments?: { text: string; kind?: TerminalLineKind }[];
  instant?: boolean;
};

const formatPerf = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  const sign = value >= 0 ? '+' : '';
  const magnitude = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(2);
  return `${sign}${magnitude}%`;
};

export const buildInvestmentsLines = (entries: InvestmentEntry[]): Line[] => {
  const lines: Line[] = [
    { text: 'RETRIEVING INVESTMENTS MODULE:', kind: 'system' },
    {
      text: `Last sync: ${formatLastSync(getLatestFetch(entries))}`,
      kind: 'muted',
    },
  ];

  if (!entries.length) {
    return lines;
  }

  entries.forEach((entry) => {
    const label = entry.label ?? entry.ticker;
    const ticker = entry.ticker.toUpperCase();

    lines.push({
      text: `${ticker}: ${label}`,
      kind: 'output',
      segments: [
        { text: `${ticker}:`, kind: 'accent' },
        { text: ` ${label}`, kind: 'output' },
      ],
    });

    const perfText = formatPerf(entry.perf6mPercent);
    let perfKind: TerminalLineKind = 'muted';
    if (perfText !== null) {
      if (entry.perf6mPercent! > 0) {
        perfKind = 'gain';
      } else if (entry.perf6mPercent! < 0) {
        perfKind = 'loss';
      } else {
        perfKind = 'flat';
      }
    }

    lines.push({
      text: `6M: ${perfText ?? 'Pending data'}`,
      kind: 'output',
      segments: [
        { text: '6M: ', kind: 'output' },
        { text: perfText ?? 'Pending data', kind: perfKind },
      ],
    });
  });

  return lines;
};

function getLatestFetch(entries: InvestmentEntry[]) {
  return entries.reduce<string | null>((latest, entry) => {
    if (!entry.perfLastFetched) {
      return latest;
    }
    if (!latest) {
      return entry.perfLastFetched;
    }
    return new Date(entry.perfLastFetched) > new Date(latest) ? entry.perfLastFetched : latest;
  }, null);
}

function formatLastSync(value: string | null) {
  if (!value) {
    return 'Awaiting data';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Awaiting data';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
