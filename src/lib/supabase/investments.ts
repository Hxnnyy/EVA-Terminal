import 'server-only';

import { unstable_cache } from 'next/cache';

import { serverEnv } from '@/lib/env.server';
import { INVESTMENTS_FALLBACK } from '@/lib/fallbacks/investments';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/lib/supabase/database.types';
import { getSupabaseReadonlyClient } from '@/lib/supabase/server-client';
import type { InvestmentProvider, InvestmentRecord } from '@/lib/types/investments';

type InvestmentRow = Database['public']['Tables']['investments']['Row'];

const INVESTMENTS_REVALIDATE_SECONDS = 600;
const INVESTMENTS_FETCH_LIMIT = 200;

const fetchInvestmentsInternal = async (): Promise<InvestmentRecord[]> => {
  const logger = createLogger({ scope: 'supabase:investments' });
  if (serverEnv.SUPABASE_DISABLED_FOR_TESTS) {
    return INVESTMENTS_FALLBACK.map((record) => ({ ...record }));
  }
  try {
    const supabase = getSupabaseReadonlyClient();
    const { data, error } = await supabase
      .from('investments')
      .select(
        'id, ticker, label, order, provider, provider_symbol, perf_6m_percent, perf_last_fetched, created_at, updated_at',
      )
      .order('order', { ascending: true })
      .limit(INVESTMENTS_FETCH_LIMIT);

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapInvestmentRow);
  } catch (error) {
    logger.warn('Investments fallback engaged', error);
    return INVESTMENTS_FALLBACK.map((record) => ({ ...record }));
  }
};

const fetchInvestmentsCached = unstable_cache(fetchInvestmentsInternal, ['investments:list:v3'], {
  revalidate: INVESTMENTS_REVALIDATE_SECONDS,
  tags: ['investments'],
});

export async function fetchInvestments(options?: {
  skipCache?: boolean;
}): Promise<InvestmentRecord[]> {
  if (options?.skipCache) {
    return fetchInvestmentsInternal();
  }
  return fetchInvestmentsCached();
}

export function mapInvestmentRow(row: InvestmentRow): InvestmentRecord {
  return {
    id: row.id,
    ticker: row.ticker,
    label: row.label,
    order: row.order ?? 0,
    provider: normalizeProvider(row.provider),
    providerSymbol: row.provider_symbol ?? null,
    perf6mPercent: typeof row.perf_6m_percent === 'number' ? Number(row.perf_6m_percent) : null,
    perfLastFetched: row.perf_last_fetched,
  };
}

function normalizeProvider(value: string | null | undefined): InvestmentProvider {
  return value?.toLowerCase() === 'alphavantage' ? 'alphavantage' : 'stooq';
}
