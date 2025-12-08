import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { validateJsonBody } from '@/lib/http/validation';
import { AdminProjectSchema } from '@/lib/schemas';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { idParamSchema } from '@/lib/validation/params';
import type { AppRouteContext } from '@/types/routes';

type ProjectRouteContext = AppRouteContext<{ id: string }>;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' as const };

export async function PUT(request: Request, context: ProjectRouteContext) {
  try {
    const resolvedParams = await context.params;
    const params = idParamSchema.safeParse(resolvedParams);
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid project id.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { id } = params.data;
    const validation = await validateJsonBody(request, AdminProjectSchema.partial(), {
      badRequestMessage: 'Invalid project payload.',
      cacheControl: NO_STORE_HEADERS['Cache-Control'],
    });
    if (!validation.ok) return validation.response;

    const parsed = validation.data;
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
    if (parsed.slug !== undefined) updates.slug = parsed.slug;
    if (parsed.title !== undefined) updates.title = parsed.title;
    if (parsed.blurb !== undefined) updates.blurb = parsed.blurb;
    if (parsed.url !== undefined) updates.url = parsed.url;
    if (parsed.tags !== undefined) updates.tags = parsed.tags;
    if (parsed.order !== undefined) updates.order = parsed.order;

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: 'No valid fields to update.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found.' },
          { status: 404, headers: NO_STORE_HEADERS },
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Project not found.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    revalidatePath('/api/projects');
    return NextResponse.json({ project: data }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update project record.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function DELETE(_request: Request, context: ProjectRouteContext) {
  try {
    const resolvedParams = await context.params;
    const params = idParamSchema.safeParse(resolvedParams);
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid project id.' },
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
      .from('projects')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found.' },
          { status: 404, headers: NO_STORE_HEADERS },
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Project not found.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    revalidatePath('/api/projects');
    return NextResponse.json({ ok: true }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete project record.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
