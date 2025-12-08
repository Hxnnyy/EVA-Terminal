import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { validateJsonBody } from '@/lib/http/validation';
import { AdminArticleSchema } from '@/lib/schemas';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

type ArticlePayload = {
  slug: string;
  title: string;
  subtitle?: string;
  body_mdx: string;
  status: 'draft' | 'published';
};

export async function POST(request: Request) {
  try {
    const validation = await validateJsonBody(request, AdminArticleSchema, {
      badRequestMessage: 'Invalid article payload.',
      preprocess: (raw) =>
        typeof raw === 'object' && raw !== null
          ? { ...(raw as ArticlePayload), body: (raw as ArticlePayload).body_mdx }
          : raw,
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
      .from('articles')
      .insert({
        slug: parsed.slug,
        title: parsed.title,
        subtitle: parsed.subtitle ?? null,
        body_mdx: parsed.body,
        status: parsed.status,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/api/writing');
    revalidatePath(`/writing/${parsed.slug}`);
    revalidateTag('articles');
    revalidateTag('writing');
    return NextResponse.json(
      { article: data },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create article.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
