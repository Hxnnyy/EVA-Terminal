import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { validateJsonBody } from '@/lib/http/validation';
import { AdminInvestmentSchema } from '@/lib/schemas';
import { mapInvestmentRow } from '@/lib/supabase/investments';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import type { InvestmentRecord } from '@/lib/types/investments';
import { idParamSchema } from '@/lib/validation/params';
import type { AppRouteContext } from '@/types/routes';

type InvestmentRouteContext = AppRouteContext<{ id: string }>;

type UpdatePayload = {
  label?: string | null;
  provider?: string | null;
  provider_symbol?: string | null;
  order?: number | null;
};

type UpdateResponse = {
  investment: InvestmentRecord;
};

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' as const };

export async function DELETE(_request: Request, context: InvestmentRouteContext) {
  try {
    const resolvedParams = await context.params;
    const params = idParamSchema.safeParse(resolvedParams);
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid investment id.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { id } = params.data;
    const supabase = await createSupabaseServerClient();
    const { revalidatePath, revalidateTag } = createRevalidateHelpers(supabase);
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: NO_STORE_HEADERS },
      );
    }

    const { data, error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Investment not found.' },
          { status: 404, headers: NO_STORE_HEADERS },
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Investment not found.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    revalidatePath('/api/investments');
    revalidateTag('investments');
    return NextResponse.json({ ok: true }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete investment.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function PUT(request: Request, context: InvestmentRouteContext) {
  try {
    const resolvedParams = await context.params;
    const params = idParamSchema.safeParse(resolvedParams);
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid investment id.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { id } = params.data;
    const validation = await validateJsonBody(request, AdminInvestmentSchema.partial(), {
      badRequestMessage: 'Invalid investment payload.',
      cacheControl: NO_STORE_HEADERS['Cache-Control'],
    });
    if (!validation.ok) return validation.response;

    const payload = validation.data as UpdatePayload & { ticker?: string };

    const supabase = await createSupabaseServerClient();
    const { revalidatePath, revalidateTag } = createRevalidateHelpers(supabase);
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: NO_STORE_HEADERS },
      );
    }

    const updates: Record<string, unknown> = {};
    if (payload.ticker !== undefined) updates.ticker = payload.ticker;
    if ('label' in payload) updates.label = payload.label ?? null;
    if ('provider' in payload) updates.provider = payload.provider ?? null;
    if ('provider_symbol' in payload) updates.provider_symbol = payload.provider_symbol ?? null;
    if ('order' in payload && typeof payload.order === 'number') {
      updates.order = payload.order;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: 'No valid fields to update.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { data, error } = await supabase
      .from('investments')
      .update(updates)
      .eq('id', id)
      .select(
        'id, ticker, label, order, provider, provider_symbol, perf_6m_percent, perf_last_fetched, created_at, updated_at',
      )
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Investment not found.' },
          { status: 404, headers: NO_STORE_HEADERS },
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Investment not found.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    revalidatePath('/api/investments');
    revalidateTag('investments');
    return NextResponse.json<UpdateResponse>(
      { investment: mapInvestmentRow(data) },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update investment.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
