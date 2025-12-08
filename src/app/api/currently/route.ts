import { NextResponse } from 'next/server';

import { CURRENTLY_FALLBACK_BODY } from '@/lib/fallbacks/currently';
import { attachRequestIdHeader, createLogger, resolveRequestId } from '@/lib/logger';
import { CurrentlySchema } from '@/lib/schemas';
import {
  type CurrentlySnapshot,
  fetchCurrentlySnapshotCached,
  parseCurrentlySingletonRow,
} from '@/lib/terminal/commands/currently.server';

export const revalidate = 300;

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
};

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const logger = createLogger({ requestId, scope: 'api:currently' });
  const respond = <T>(body: T, init?: ResponseInit) =>
    attachRequestIdHeader(NextResponse.json<T>(body, init), requestId);

  try {
    const snapshot = await fetchCurrentlySnapshotCached();
    const parsed = CurrentlySchema.safeParse(snapshot);
    if (!parsed.success) {
      logger.error('Currently response failed validation', parsed.error.flatten());
      throw new Error('Currently response malformed');
    }
    return respond<CurrentlySnapshot>(snapshot, {
      status: 200,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    logger.warn('Falling back to static currently singleton', error);
    const fallback = parseCurrentlySingletonRow({
      body_mdx: CURRENTLY_FALLBACK_BODY,
      updated_at: null,
    });
    return respond<CurrentlySnapshot>(fallback, {
      status: 200,
      headers: CACHE_HEADERS,
    });
  }
}
