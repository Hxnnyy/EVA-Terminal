import { fetchAlphaVantageSixMonthPerformance } from '@/lib/investments/alphavantage';
import { fetchStooqSixMonthPerformance } from '@/lib/investments/stooq';
import type { InvestmentRecord } from '@/lib/types/investments';

type PerformanceSource = 'stooq' | 'alphavantage';

type Target = Pick<InvestmentRecord, 'ticker' | 'provider' | 'providerSymbol'>;

export async function fetchInvestmentPerformance(
  target: Target,
): Promise<{ value: number; source: PerformanceSource } | null> {
  const provider = normalizeProvider(target.provider);

  if (provider === 'alphavantage') {
    const alphaResult = await tryAlpha(target);
    if (alphaResult) {
      return alphaResult;
    }
    const fallbackStooq = await tryStooq(target);
    if (fallbackStooq) {
      return fallbackStooq;
    }
    return null;
  }

  const stooqResult = await tryStooq(target);
  if (stooqResult) {
    return stooqResult;
  }

  const alphaResult = await tryAlpha(target);
  if (alphaResult) {
    return alphaResult;
  }

  return null;
}

function normalizeProvider(provider: string | null | undefined): PerformanceSource {
  return provider?.toLowerCase() === 'alphavantage' ? 'alphavantage' : 'stooq';
}

async function tryStooq(target: Target) {
  const symbol = (target.providerSymbol || `${target.ticker.toLowerCase()}.us`).toLowerCase();
  const perf = await fetchStooqSixMonthPerformance(symbol);
  return perf === null ? null : { value: perf, source: 'stooq' as const };
}

async function tryAlpha(target: Target) {
  const symbol = target.providerSymbol ?? target.ticker;
  const perf = await fetchAlphaVantageSixMonthPerformance(symbol);
  return perf === null ? null : { value: perf, source: 'alphavantage' as const };
}
