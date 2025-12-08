import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';

import { INVESTMENTS_FALLBACK } from '@/lib/fallbacks/investments';
import type { Database } from '@/lib/supabase/database.types';
import type { InvestmentProvider, InvestmentRecord } from '@/lib/types/investments';

import type { SectionState } from '../../types';

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const normalizeProvider = (value: string | null | undefined): InvestmentProvider =>
  value?.toLowerCase() === 'alphavantage' ? 'alphavantage' : 'stooq';

const mapInvestmentRow = (
  row: Database['public']['Tables']['investments']['Row'],
): InvestmentRecord => ({
  id: row.id,
  ticker: row.ticker,
  label: row.label ?? null,
  order: row.order ?? 0,
  provider: normalizeProvider(row.provider),
  providerSymbol: row.provider_symbol ?? null,
  perf6mPercent: typeof row.perf_6m_percent === 'number' ? Number(row.perf_6m_percent) : null,
  perfLastFetched: row.perf_last_fetched,
});

const INVESTMENTS_FETCH_LIMIT = 200;

export async function loadInvestments(
  supabase: SupabaseClient<Database>,
): Promise<SectionState<InvestmentRecord[]>> {
  noStore();
  try {
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

    const mapped: InvestmentRecord[] = (data ?? []).map(mapInvestmentRow);
    return { status: 'ok', data: mapped };
  } catch (error) {
    const fallback = INVESTMENTS_FALLBACK.map((record) => ({ ...record }));
    return {
      status: 'error',
      data: fallback,
      message: toErrorMessage(
        error,
        'Unable to load investments. Using fallback records; retry after Supabase connectivity is restored.',
      ),
    };
  }
}
