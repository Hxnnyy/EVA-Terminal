import { NextResponse } from 'next/server';

import type { Logger } from '@/lib/logger';
import { attachRequestIdHeader, createLogger, resolveRequestId } from '@/lib/logger';
import { type InvestmentResponse, InvestmentResponseSchema } from '@/lib/schemas';
import { fetchInvestments } from '@/lib/supabase/investments';
import type { InvestmentRecord } from '@/lib/types/investments';

export const revalidate = 600;

// Use s-maxage for CDN caching (can be purged via revalidatePath)
// stale-while-revalidate allows serving stale content while fetching fresh
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
};

type ErrorResponse = {
  error: string;
  requestId: string;
};

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const logger = createLogger({ requestId, scope: 'api:investments' });
  const respond = <T>(body: T, init?: ResponseInit) =>
    attachRequestIdHeader(NextResponse.json<T>(body, init), requestId);

  try {
    const rows = await fetchInvestments();
    const enriched = rows.map((row) => mapInvestment(row, logger));
    const validation = InvestmentResponseSchema.safeParse({ investments: enriched });
    if (!validation.success) {
      logger.error('Investments response failed validation', validation.error.flatten());
      return respond<ErrorResponse>(
        { error: 'Investments module returned malformed data.', requestId },
        { status: 500 },
      );
    }

    return respond<InvestmentResponse>(validation.data, {
      status: 200,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    logger.error('Failed to load investments', error);
    return respond<ErrorResponse>(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Investments module is unavailable. Retry shortly.',
        requestId,
      },
      { status: 500 },
    );
  }
}

function mapInvestment(
  row: InvestmentRecord,
  logger: Logger,
): InvestmentResponse['investments'][number] {
  if (row.perf6mPercent === null && row.perfLastFetched) {
    logger.warn('Investment missing performance despite perfLastFetched timestamp', {
      id: row.id,
      ticker: row.ticker,
    });
  }

  return {
    ...row,
    source: row.perf6mPercent === null ? 'missing' : 'cache',
  };
}
