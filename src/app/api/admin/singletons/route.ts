import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { AdminSingletonSchema } from '@/lib/schemas';
import type { Database, Json } from '@/lib/supabase/database.types';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

type SingletonInsert = Database['public']['Tables']['singletons']['Insert'];

type Payload = {
  key: SingletonInsert['key'];
  body_mdx?: SingletonInsert['body_mdx'];
  meta?: SingletonInsert['meta'];
};

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const parsed = AdminSingletonSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid singleton payload.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { revalidatePath, revalidateTag } = createRevalidateHelpers(supabase);
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const meta: Json | undefined = 'meta' in payload ? (parsed.data.meta as Json) : undefined;

    const { error } = await supabase.from('singletons').upsert({
      key: parsed.data.key,
      body_mdx: 'body_mdx' in payload ? (parsed.data.body_mdx ?? null) : undefined,
      meta,
    });

    if (error) {
      return NextResponse.json(
        { error: `Unable to update ${payload.key}: ${error.message}` },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    switch (parsed.data.key) {
      case 'bio':
        revalidateTag('bio');
        revalidateTag('singletons');
        revalidatePath('/api/bio');
        break;
      case 'currently':
        revalidateTag('currently');
        revalidateTag('singletons');
        revalidatePath('/api/currently');
        break;
      case 'contact':
        revalidateTag('contact');
        revalidateTag('singletons');
        revalidatePath('/api/contact');
        break;
      case 'onepager':
        revalidateTag('onepager');
        revalidateTag('singletons');
        break;
      default:
        revalidateTag('singletons');
        break;
    }

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update singleton content.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
