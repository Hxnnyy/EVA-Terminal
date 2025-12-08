import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { validateJsonBody } from '@/lib/http/validation';
import { AdminReelUpdateSchema } from '@/lib/schemas';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { idParamSchema } from '@/lib/validation/params';
import type { AppRouteContext } from '@/types/routes';

type ReelRouteContext = AppRouteContext<{ id: string }>;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' as const };

export async function PUT(request: Request, context: ReelRouteContext) {
  try {
    const resolvedParams = await context.params;
    const params = idParamSchema.safeParse(resolvedParams);
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid reel id.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { id } = params.data;
    const validation = await validateJsonBody(request, AdminReelUpdateSchema, {
      badRequestMessage: 'Invalid reel update payload.',
      cacheControl: NO_STORE_HEADERS['Cache-Control'],
    });
    if (!validation.ok) return validation.response;
    const parsed = validation.data;

    const updates: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(parsed, 'caption')) {
      updates.caption = parsed.caption ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'order')) {
      updates.order = parsed.order ?? 0;
    }
    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: 'No fields provided.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

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
      .from('reel_images')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Reel image not found.' },
          { status: 404, headers: NO_STORE_HEADERS },
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Reel image not found.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    revalidatePath('/api/reel');
    return NextResponse.json({ image: data }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update reel image.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function DELETE(_request: Request, context: ReelRouteContext) {
  try {
    const resolvedParams = await context.params;
    const params = idParamSchema.safeParse(resolvedParams);
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid reel id.' },
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
      .from('reel_images')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Reel image not found.' },
          { status: 404, headers: NO_STORE_HEADERS },
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Reel image not found.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    revalidatePath('/api/reel');
    return NextResponse.json({ ok: true }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete reel image.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
