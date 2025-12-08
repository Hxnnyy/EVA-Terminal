import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { validateJsonBody } from '@/lib/http/validation';
import { AdminProjectSchema } from '@/lib/schemas';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export async function POST(request: Request) {
  try {
    const validation = await validateJsonBody(request, AdminProjectSchema, {
      badRequestMessage: 'Invalid project payload.',
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

    const { data, error } = await supabase
      .from('projects')
      .insert({
        slug: parsed.slug,
        title: parsed.title,
        blurb: parsed.blurb ?? '',
        url: parsed.url,
        tags: parsed.tags ?? [],
        order: parsed.order ?? 0,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/api/projects');
    revalidateTag('projects');
    return NextResponse.json(
      { project: data },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create project record.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
