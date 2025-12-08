import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { serverEnv } from '@/lib/env.server';
import { fetchInvestmentPerformance } from '@/lib/investments/performance';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/lib/supabase/database.types';
import { mapInvestmentRow } from '@/lib/supabase/investments';
import {
  getSupabaseServiceRoleClient,
  SupabaseServiceRoleError,
} from '@/lib/supabase/service-role-client';

type InvestmentRow = Database['public']['Tables']['investments']['Row'];

export type RefreshInvestmentsResult = {
  results: Array<{
    ticker: string | null;
    updated: boolean;
    source: 'stooq' | 'alphavantage' | 'missing';
  }>;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function getLastInvestmentRefresh({
  supabase,
}: {
  supabase?: SupabaseClient<Database>;
} = {}): Promise<Date | null> {
  const client = supabase ?? getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from('investments')
    .select('perf_last_fetched')
    .order('perf_last_fetched', { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const value = data?.[0]?.perf_last_fetched;
  return value ? new Date(value) : null;
}

export async function refreshInvestmentsPerformance({
  supabase,
}: {
  supabase?: SupabaseClient<Database>;
} = {}): Promise<RefreshInvestmentsResult> {
  const logger = createLogger({ scope: 'investments:refresh' });

  if (!serverEnv.SUPABASE_SERVICE_ROLE && !supabase) {
    const error = new SupabaseServiceRoleError();
    logger.error('Supabase service role key missing for investment refresh.');
    throw error;
  }

  const client = supabase ?? getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from('investments')
    .select(
      'id, ticker, label, order, provider, provider_symbol, perf_6m_percent, perf_last_fetched, created_at, updated_at',
    )
    .order('order', { ascending: true });

  if (error) {
    logger.error('Failed to load investments for refresh', error);
    throw error;
  }

  const rows: InvestmentRow[] = data ?? [];
  const results: RefreshInvestmentsResult['results'] = [];

  for (const row of rows) {
    const record = mapInvestmentRow(row);
    const performance = await fetchInvestmentPerformance(record);
    if (!performance) {
      results.push({
        ticker: record.ticker,
        updated: false,
        source: 'missing',
      });
      continue;
    }

    const fetchedAt = new Date();
    const { error: updateError } = await client
      .from('investments')
      .update({
        perf_6m_percent: performance.value.toString(),
        perf_last_fetched: fetchedAt.toISOString(),
      })
      .eq('id', record.id);

    if (updateError) {
      logger.warn('Failed to update investment performance (service role)', {
        id: record.id,
        ticker: record.ticker,
        error: updateError,
      });
      results.push({
        ticker: record.ticker,
        updated: false,
        source: performance.source,
      });
      continue;
    }

    results.push({
      ticker: record.ticker,
      updated: true,
      source: performance.source,
    });
  }

  return { results };
}

export type MaybeRefreshResult = RefreshInvestmentsResult & {
  status: 'refreshed' | 'skipped';
  lastRefreshed: string | null;
};

export async function maybeRefreshInvestments({
  force = false,
  minIntervalMs = ONE_DAY_MS,
  supabase,
  now = new Date(),
  refreshFn = refreshInvestmentsPerformance,
  getLastRefreshFn = getLastInvestmentRefresh,
}: {
  force?: boolean;
  minIntervalMs?: number;
  supabase?: SupabaseClient<Database>;
  now?: Date;
  refreshFn?: typeof refreshInvestmentsPerformance;
  getLastRefreshFn?: typeof getLastInvestmentRefresh;
} = {}): Promise<MaybeRefreshResult> {
  const logger = createLogger({ scope: 'investments:refresh' });
  const client = supabase ?? getSupabaseServiceRoleClient();

  let lastRefreshed: Date | null = null;
  try {
    lastRefreshed = await getLastRefreshFn({ supabase: client });
  } catch (error) {
    logger.warn('Unable to read last investment refresh timestamp; proceeding to refresh.', error);
  }

  if (!force && lastRefreshed) {
    const elapsedMs = now.getTime() - lastRefreshed.getTime();
    if (elapsedMs < minIntervalMs) {
      logger.info('Skipping investments refresh; last run within guard window.', {
        lastRefreshed: lastRefreshed.toISOString(),
        elapsedMs,
      });
      return {
        status: 'skipped',
        lastRefreshed: lastRefreshed.toISOString(),
        results: [],
      };
    }
  }

  const refreshResult = await refreshFn({ supabase: client });
  const refreshedAt = now.toISOString();

  logger.info('Investments refresh completed', {
    updated: refreshResult.results.filter((row) => row.updated).length,
    skipped: refreshResult.results.filter((row) => !row.updated).length,
  });

  return {
    status: 'refreshed',
    lastRefreshed: refreshedAt,
    results: refreshResult.results,
  };
}
