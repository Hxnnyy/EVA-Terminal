import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { serverEnv } from '@/lib/env.server';
import { WRITING_FALLBACK } from '@/lib/fallbacks/writing';
import { attachRequestIdHeader, createLogger, resolveRequestId } from '@/lib/logger';
import { mdxToPlainParagraphs } from '@/lib/mdx/plaintext';
import { WritingDetailSchema } from '@/lib/schemas';
import { fetchArticleBySlug } from '@/lib/supabase/articles';
import { SupabaseEnvError } from '@/lib/supabase/server-client';
import { slugParamSchema } from '@/lib/validation/params';
import type { AppRouteContext } from '@/types/routes';

export const revalidate = 300;

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
};

type WritingDetailResponse = z.infer<typeof WritingDetailSchema>;

type ErrorResponse = {
  error: string;
  requestId: string;
};

type WritingRouteContext = AppRouteContext<{ slug: string }>;

export async function GET(request: Request, context: WritingRouteContext) {
  const requestId = resolveRequestId(request);
  const logger = createLogger({ requestId, scope: 'api:writing:detail' });
  const respond = <T>(body: T, init?: ResponseInit) =>
    attachRequestIdHeader(NextResponse.json<T>(body, init), requestId);

  const resolvedParams = await context.params;
  const parsedParams = slugParamSchema.safeParse(resolvedParams);
  if (!parsedParams.success) {
    return respond<ErrorResponse>({ error: 'Invalid slug parameter.', requestId }, { status: 400 });
  }
  const { slug } = parsedParams.data;

  try {
    const article = await fetchArticleBySlug(slug);
    if (!article) {
      return respond<ErrorResponse>({ error: 'Article not found.', requestId }, { status: 404 });
    }
    const isFallback = article.id.startsWith('fallback-');
    const payload: WritingDetailResponse = {
      article: {
        ...article,
        subtitle: article.subtitle ?? '',
        plainBody: mdxToPlainParagraphs(article.bodyMdx),
      },
      meta: { source: isFallback ? 'fallback' : 'supabase' },
    };
    const parsed = WritingDetailSchema.safeParse(payload);
    if (!parsed.success) {
      logger.error('Writing detail response failed validation', parsed.error.flatten());
      throw new Error('Writing detail response malformed');
    }
    return respond<WritingDetailResponse>(parsed.data, {
      status: 200,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    const allowFallback =
      serverEnv.SUPABASE_DISABLED_FOR_TESTS || error instanceof SupabaseEnvError;
    if (!allowFallback) {
      logger.error(`Writing detail fetch failed for ${slug}`, error);
      return respond<ErrorResponse>(
        { error: 'Unable to load article. Supabase returned an error.', requestId },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    logger.warn(`Falling back to static writing article ${slug}`, error);
    const fallback = WRITING_FALLBACK.find((entry) => entry.slug === slug);
    if (!fallback) {
      return respond<ErrorResponse>(
        { error: 'Article not available.', requestId },
        { status: 404 },
      );
    }
    const payload: WritingDetailResponse = {
      article: {
        id: `fallback-${fallback.slug}`,
        slug: fallback.slug,
        title: fallback.title,
        subtitle: fallback.subtitle ?? '',
        publishedAt: fallback.published_at,
        bodyMdx: fallback.body_mdx,
        plainBody: mdxToPlainParagraphs(fallback.body_mdx),
      },
      meta: { source: 'fallback' },
    };
    const parsed = WritingDetailSchema.safeParse(payload);
    if (!parsed.success) {
      logger.error('Fallback writing detail failed validation', parsed.error.flatten());
      return respond<ErrorResponse>(
        { error: 'Article not available.', requestId },
        { status: 500 },
      );
    }
    return respond<WritingDetailResponse>(parsed.data, {
      status: 200,
      headers: CACHE_HEADERS,
    });
  }
}
