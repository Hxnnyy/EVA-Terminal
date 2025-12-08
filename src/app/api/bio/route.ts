import { NextResponse } from 'next/server';

import { attachRequestIdHeader, createLogger, resolveRequestId } from '@/lib/logger';
import { BioSchema } from '@/lib/schemas';
import { SupabaseEnvError } from '@/lib/supabase/server-client';
import { fetchBioSingletonCached } from '@/lib/terminal/commands/bio.server';

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
  const logger = createLogger({ requestId, scope: 'api:bio' });
  const respond = <T>(body: T, init?: ResponseInit) =>
    attachRequestIdHeader(NextResponse.json<T>(body, init), requestId);

  try {
    const snapshot = await fetchBioSingletonCached();
    const parsed = BioSchema.safeParse(snapshot);
    if (!parsed.success) {
      logger.error('Bio response failed validation', parsed.error.flatten());
      return respond<ErrorResponse>(
        { error: 'Bio dossier is unavailable.', requestId },
        { status: 500 },
      );
    }
    return respond(snapshot, {
      status: 200,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    if (error instanceof SupabaseEnvError) {
      logger.warn('Bio singleton unavailable', { message: error.message });
      return respond<ErrorResponse>(
        {
          error:
            'Supabase credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable the bio dossier.',
          requestId,
        },
        { status: 503 },
      );
    }

    logger.error('Unhandled bio API error', error);
    return respond<ErrorResponse>(
      { error: 'Unable to load bio dossier.', requestId },
      { status: 500 },
    );
  }
}
