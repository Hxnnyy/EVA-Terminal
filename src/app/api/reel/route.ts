import { NextResponse } from 'next/server';

import { REEL_FALLBACK } from '@/lib/fallbacks/reel';
import { attachRequestIdHeader, createLogger, resolveRequestId } from '@/lib/logger';
import { ReelResponseSchema } from '@/lib/schemas';
import { fetchReelImagesCached } from '@/lib/supabase/reel';

export const revalidate = 300;

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
};

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const logger = createLogger({ requestId, scope: 'api:reel' });
  const respond = <T>(body: T, init?: ResponseInit) =>
    attachRequestIdHeader(NextResponse.json<T>(body, init), requestId);

  const buildFallback = () => ({
    images: REEL_FALLBACK.map((entry, index) => ({
      id: `fallback-${index}`,
      url: entry.url,
      caption: entry.caption,
      order: index,
    })),
    meta: { source: 'fallback' },
  });

  try {
    const images = await fetchReelImagesCached();
    if (!images.length) {
      logger.warn('Reel images empty. Serving fallback content.');
      return respond(buildFallback(), { status: 200, headers: CACHE_HEADERS });
    }
    const parsed = ReelResponseSchema.safeParse({ images, meta: { source: 'supabase' } });
    if (!parsed.success) {
      logger.error('Reel response failed validation', parsed.error.flatten());
      return respond(buildFallback(), { status: 200, headers: CACHE_HEADERS });
    }
    return respond(parsed.data, { status: 200, headers: CACHE_HEADERS });
  } catch (error) {
    logger.warn('Falling back to static reel images', error);
    return respond(buildFallback(), { status: 200, headers: CACHE_HEADERS });
  }
}
