import { NextResponse } from 'next/server';

import { serverEnv } from '@/lib/env.server';
import { WRITING_FALLBACK } from '@/lib/fallbacks/writing';
import { attachRequestIdHeader, createLogger, resolveRequestId } from '@/lib/logger';
import { type WritingListResponse, WritingListResponseSchema } from '@/lib/schemas';
import { fetchArticleSummaries } from '@/lib/supabase/articles';
import { SupabaseEnvError } from '@/lib/supabase/server-client';

export const revalidate = 300;

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
};

type ErrorResponse = {
  error: string;
  requestId: string;
};

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const logger = createLogger({ requestId, scope: 'api:writing:list' });
  const respond = <T>(body: T, init?: ResponseInit) =>
    attachRequestIdHeader(NextResponse.json<T>(body, init), requestId);

  try {
    const summaries = await fetchArticleSummaries();
    const isFallback =
      summaries.length > 0 && summaries.every((article) => article.id.startsWith('fallback-'));
    const articles = summaries.map((article) => ({
      ...article,
      subtitle: article.subtitle ?? '',
      publishedAt: article.publishedAt ?? undefined,
    }));
    const payload: WritingListResponse = {
      articles,
      meta: { source: isFallback ? 'fallback' : 'supabase' },
    };
    const parsed = WritingListResponseSchema.safeParse(payload);
    if (!parsed.success) {
      logger.error('Writing response failed validation', parsed.error.flatten());
      throw new Error('Writing response malformed');
    }
    return respond<WritingListResponse>(parsed.data, {
      status: 200,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    const allowFallback =
      serverEnv.SUPABASE_DISABLED_FOR_TESTS || error instanceof SupabaseEnvError;
    if (!allowFallback) {
      logger.error('Writing summaries failed', error);
      return respond<ErrorResponse>(
        { error: 'Unable to load articles. Supabase returned an error.', requestId },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    logger.warn('Falling back to static writing summaries', error);
    const articles = WRITING_FALLBACK.map((entry) => ({
      id: `fallback-${entry.slug}`,
      slug: entry.slug,
      title: entry.title,
      subtitle: entry.subtitle,
      publishedAt: entry.published_at,
    }));
    return respond<WritingListResponse>(
      { articles, meta: { source: 'fallback' } },
      { status: 200, headers: CACHE_HEADERS },
    );
  }
}
