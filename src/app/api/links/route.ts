import { NextResponse } from 'next/server';

import { LINKS_FALLBACK } from '@/lib/fallbacks/links';
import { attachRequestIdHeader, createLogger, resolveRequestId } from '@/lib/logger';
import { type LinksResponse, LinksResponseSchema } from '@/lib/schemas';
import { fetchLinksCached } from '@/lib/supabase/links';

export const revalidate = 300;

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
};

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const logger = createLogger({ requestId, scope: 'api:links' });
  const respond = <T>(body: T, init?: ResponseInit) =>
    attachRequestIdHeader(NextResponse.json<T>(body, init), requestId);

  try {
    const links = await fetchLinksCached();
    const payload: LinksResponse = { links, meta: { source: 'supabase' as const } };
    const parsed = LinksResponseSchema.safeParse(payload);
    if (!parsed.success) {
      logger.error('Links response failed validation', parsed.error.flatten());
      throw new Error('Links response malformed');
    }
    return respond<LinksResponse>(parsed.data, { status: 200, headers: CACHE_HEADERS });
  } catch (error) {
    logger.warn('Falling back to static links', error);
    return respond<LinksResponse>(
      { links: LINKS_FALLBACK, meta: { source: 'fallback' } },
      { status: 200, headers: CACHE_HEADERS },
    );
  }
}
