import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { validateJsonBody } from '@/lib/http/validation';
import { AdminLinkSchema } from '@/lib/schemas';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export async function POST(request: Request) {
  try {
    const validation = await validateJsonBody(request, AdminLinkSchema, {
      badRequestMessage: 'Invalid link payload.',
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
      .from('links')
      .insert({
        category: parsed.category,
        label: parsed.label,
        url: parsed.url,
        order: parsed.order ?? 0,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/api/links');
    revalidateTag('links');
    return NextResponse.json(
      { link: data },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create link record.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
