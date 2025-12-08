import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { validateJsonBody } from '@/lib/http/validation';
import { AdminArticleSchema } from '@/lib/schemas';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { idParamSchema } from '@/lib/validation/params';
import type { AppRouteContext } from '@/types/routes';

type ArticlePayload = {
  slug?: string;
  title?: string;
  subtitle?: string | null;
  body?: string;
  body_mdx?: string;
  status?: 'draft' | 'published';
};

type ArticleRouteContext = AppRouteContext<{ id: string }>;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' as const };

export async function GET(_request: Request, context: ArticleRouteContext) {
  try {
    const resolvedParams = await context.params;
    const params = idParamSchema.safeParse(resolvedParams);
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid article id.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { id } = params.data;
    const supabase = await createSupabaseServerClient();
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: NO_STORE_HEADERS },
      );
    }

    const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Article not found.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json({ article: data }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load article.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function PUT(request: Request, context: ArticleRouteContext) {
  try {
    const resolvedParams = await context.params;
    const params = idParamSchema.safeParse(resolvedParams);
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid article id.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { id } = params.data;
    const validation = await validateJsonBody(request, AdminArticleSchema.partial(), {
      badRequestMessage: 'Invalid article payload.',
      cacheControl: NO_STORE_HEADERS['Cache-Control'],
      preprocess: (raw) =>
        typeof raw === 'object' && raw !== null
          ? {
              ...(raw as ArticlePayload),
              body: (raw as ArticlePayload).body_mdx ?? (raw as ArticlePayload).body,
            }
          : raw,
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
    if (parsed.subtitle !== undefined) updates.subtitle = parsed.subtitle ?? null;
    if (parsed.body !== undefined) updates.body_mdx = parsed.body;
    if (parsed.status !== undefined) updates.status = parsed.status;

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: 'No valid fields to update.' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { data, error } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Article not found.' },
          { status: 404, headers: NO_STORE_HEADERS },
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Article not found.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    revalidatePath('/api/writing');
    if (parsed.slug) {
      revalidatePath(`/writing/${parsed.slug}`);
    }
    return NextResponse.json({ article: data }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update article.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function DELETE(_request: Request, context: ArticleRouteContext) {
  try {
    const resolvedParams = await context.params;
    const params = idParamSchema.safeParse(resolvedParams);
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid article id.' },
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
      .from('articles')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Article not found.' },
          { status: 404, headers: NO_STORE_HEADERS },
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Article not found.' },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    revalidatePath('/api/writing');
    return NextResponse.json({ ok: true }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete article.',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
