import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { maybeRefreshInvestments } from '@/lib/investments/refresh';
import { fetchInvestments } from '@/lib/supabase/investments';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function POST(_request?: Request) {
  void _request;
  try {
    const supabase = await createSupabaseServerClient();
    const { revalidatePath, revalidateTag } = createRevalidateHelpers(supabase);
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: NO_STORE_HEADERS },
      );
    }

    const refreshResult = await maybeRefreshInvestments({ force: true });
    const investments = await fetchInvestments({ skipCache: true });

    revalidatePath('/api/investments');
    revalidateTag('investments');
    return NextResponse.json(
      {
        ...refreshResult,
        investments,
      },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to refresh investments.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
