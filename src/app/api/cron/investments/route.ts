import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { serverEnv } from '@/lib/env.server';
import { maybeRefreshInvestments } from '@/lib/investments/refresh';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vercel Cron endpoint for refreshing investment performance data.
 * Runs daily at 4am CET (3am UTC), after Stooq updates their daily CSVs (~3am CET).
 *
 * Secured via CRON_SECRET environment variable — Vercel automatically sends
 * the secret in the Authorization header for cron invocations.
 */
export async function GET(request: Request) {
  const logger = createLogger({ scope: 'cron:investments' });

  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const expectedToken = serverEnv.CRON_SECRET;

  if (!expectedToken) {
    logger.warn('CRON_SECRET not configured; cron endpoint is disabled.');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    logger.warn('Unauthorized cron request attempted.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('Starting scheduled investments refresh...');
    const result = await maybeRefreshInvestments({ force: true });

    // Invalidate all Next.js cache layers:
    // 1. Tag-based cache (unstable_cache in data fetcher)
    // 2. Path-based cache (ISR route cache)
    revalidateTag('investments', 'max');
    revalidatePath('/api/investments');
    logger.info('Cache invalidated for investments (tag + path)');

    logger.info('Scheduled investments refresh completed', {
      status: result.status,
      updated: result.results.filter((r) => r.updated).length,
      skipped: result.results.filter((r) => !r.updated).length,
    });

    return NextResponse.json({
      ok: true,
      status: result.status,
      lastRefreshed: result.lastRefreshed,
      updated: result.results.filter((r) => r.updated).length,
      skipped: result.results.filter((r) => !r.updated).length,
    });
  } catch (error) {
    logger.error('Scheduled investments refresh failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Refresh failed' },
      { status: 500 },
    );
  }
}
