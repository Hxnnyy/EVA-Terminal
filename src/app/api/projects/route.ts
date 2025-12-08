import { NextResponse } from 'next/server';

import { attachRequestIdHeader, createLogger, resolveRequestId } from '@/lib/logger';
import { ProjectsResponseSchema } from '@/lib/schemas';
import { fetchProjects, type ProjectsPayload } from '@/lib/supabase/projects';
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
  const logger = createLogger({ requestId, scope: 'api:projects' });
  const respond = <T>(body: T, init?: ResponseInit) =>
    attachRequestIdHeader(NextResponse.json<T>(body, init), requestId);

  try {
    const projects = await fetchProjects();
    const parsed = ProjectsResponseSchema.safeParse({ projects });
    if (!parsed.success) {
      logger.error('Projects response failed validation', parsed.error.flatten());
      throw new Error('Projects response malformed');
    }
    return respond<ProjectsPayload>(parsed.data, { status: 200, headers: CACHE_HEADERS });
  } catch (error) {
    if (error instanceof SupabaseEnvError) {
      logger.warn('Projects registry unavailable', { message: error.message });
      return respond<ErrorResponse>(
        {
          error:
            'Supabase credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable the projects registry.',
          requestId,
        },
        { status: 503 },
      );
    }

    logger.error('Failed to load projects from Supabase', error);
    return respond<ErrorResponse>(
      {
        error: 'Projects registry is offline. Retry shortly or contact the operator.',
        requestId,
      },
      { status: 500 },
    );
  }
}
