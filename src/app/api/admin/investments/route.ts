import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { validateJsonBody } from '@/lib/http/validation';
import { AdminInvestmentSchema } from '@/lib/schemas';
import { mapInvestmentRow } from '@/lib/supabase/investments';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import type { InvestmentRecord } from '@/lib/types/investments';

type ResponseBody = {
  investment: InvestmentRecord;
};

export async function POST(request: Request) {
  try {
    const validation = await validateJsonBody(request, AdminInvestmentSchema, {
      badRequestMessage: 'Invalid investment payload.',
    });
    if (!validation.ok) return validation.response;

    const parsed = validation.data;
    const supabase = await createSupabaseServerClient();
    const { revalidatePath, revalidateTag } = createRevalidateHelpers(supabase);
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const ticker = parsed.ticker.trim().toUpperCase();
    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const normalizedProvider = (parsed.provider ?? 'stooq').toLowerCase();
    const provider: 'stooq' | 'alphavantage' =
      normalizedProvider === 'alphavantage' ? 'alphavantage' : 'stooq';
    const providerSymbol =
      parsed.provider_symbol?.trim() ||
      (provider === 'stooq' ? `${ticker.toLowerCase()}.us` : ticker);

    const { data, error } = await supabase
      .from('investments')
      .insert({
        ticker,
        label: parsed.label?.trim() || null,
        provider,
        provider_symbol: providerSymbol,
        order: Number.isFinite(Number(parsed.order)) ? Number(parsed.order) : 0,
      })
      .select(
        'id, ticker, label, order, provider, provider_symbol, perf_6m_percent, perf_last_fetched, created_at, updated_at',
      )
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/api/investments');
    revalidateTag('investments');
    return NextResponse.json<ResponseBody>(
      { investment: mapInvestmentRow(data) },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create investment.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
