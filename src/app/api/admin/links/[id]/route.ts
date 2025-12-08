import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { validateJsonBody } from '@/lib/http/validation';
import { AdminLinkSchema } from '@/lib/schemas';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { idParamSchema } from '@/lib/validation/params';
import type { AppRouteContext } from '@/types/routes';

type LinkRouteContext = AppRouteContext<{ id: string }>;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' as const };

export async function PUT(request: Request, context: LinkRouteContext) {
  try {
    const resolvedParams = await context.params;
    const params = idParamSchema.safeParse(resolvedParams);
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid link id.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { id } = params.data;
    const validation = await validateJsonBody(request, AdminLinkSchema.partial(), {
      badRequestMessage: 'Invalid link payload.',
      cacheControl: NO_STORE_HEADERS['Cache-Control'],
    });
    if (!validation.ok) return validation.response;

    const payload = validation.data;
    const supabase = await createSupabaseServerClient();
    const { revalidatePath } = createRevalidateHelpers(supabase);
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: NO_STORE_HEADERS },
      );
    }

    const updates: Record<string, unknown> = {};
    if (payload.category !== undefined) updates.category = payload.category;
    if (payload.label !== undefined) updates.label = payload.label;
    if (payload.url !== undefined) updates.url = payload.url;
    if (payload.order !== undefined) updates.order = payload.order;

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: 'No valid fields to update.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { data, error } = await supabase
      .from('links')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Link not found.' },
          { status: 404, headers: NO_STORE_HEADERS },
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Link not found.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    revalidatePath('/api/links');
    return NextResponse.json({ link: data }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update link record.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function DELETE(_request: Request, context: LinkRouteContext) {
  try {
    const resolvedParams = await context.params;
    const params = idParamSchema.safeParse(resolvedParams);
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid link id.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { id } = params.data;
    const supabase = await createSupabaseServerClient();
    const { revalidatePath } = createRevalidateHelpers(supabase);
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: NO_STORE_HEADERS },
      );
    }

    const { data, error } = await supabase
      .from('links')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Link not found.' },
          { status: 404, headers: NO_STORE_HEADERS },
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Link not found.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    revalidatePath('/api/links');
    return NextResponse.json({ ok: true }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete link record.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
