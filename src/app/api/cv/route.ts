import { NextResponse } from 'next/server';
import { z } from 'zod';

import { serverEnv } from '@/lib/env.server';
import { CV_FALLBACK_METADATA } from '@/lib/fallbacks/cv';
import { attachRequestIdHeader, createLogger, resolveRequestId } from '@/lib/logger';
import type { Database } from '@/lib/supabase/database.types';
import { getSupabaseReadonlyClient, SupabaseEnvError } from '@/lib/supabase/server-client';
import type { CvMetadata } from '@/lib/terminal/commands/cv';

type SingletonRow = Database['public']['Tables']['singletons']['Row'];

type CvMetaRecord = {
  download_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  last_updated?: string;
  checksum?: string;
};

type CvResponse = CvMetadata;

type ErrorResponse = {
  error: string;
  requestId: string;
};

export const revalidate = 300;

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
};

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const logger = createLogger({ requestId, scope: 'api:cv' });
  const respond = <T>(body: T, init?: ResponseInit) =>
    attachRequestIdHeader(NextResponse.json<T>(body, init), requestId);

  try {
    const supabase = getSupabaseReadonlyClient();
    const { data: row, error } = await supabase
      .from('singletons')
      .select('*')
      .eq('key', 'cv_meta')
      .maybeSingle();

    const data = row && 'meta' in row ? { meta: row.meta as SingletonRow['meta'] } : null;

    if (error) {
      logger.error('Failed to read CV metadata from Supabase', error);
      return respond<ErrorResponse>(
        { error: 'Unable to read CV metadata.', requestId },
        { status: 500 },
      );
    }

    const parsed = extractMeta(data?.meta ?? null);
    if (!parsed.downloadUrl) {
      const fallback = getFallbackFromEnv();
      if (fallback) {
        return respond<CvResponse>(fallback, {
          status: 200,
          headers: CACHE_HEADERS,
        });
      }

      return respond<ErrorResponse>(
        {
          error:
            'CV download URL has not been configured. Upload a PDF and set metadata via the admin dashboard.',
          requestId,
        },
        { status: 503 },
      );
    }

    return respond<CvResponse>(parsed, {
      status: 200,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    if (error instanceof SupabaseEnvError) {
      logger.warn('CV metadata unavailable', { message: error.message });
      const fallback = getFallbackFromEnv();
      if (fallback) {
        return respond<CvResponse>(fallback, {
          status: 200,
          headers: CACHE_HEADERS,
        });
      }

      return respond<ErrorResponse>(
        {
          error:
            'Supabase credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or provide CV fallback environment variables.',
          requestId,
        },
        { status: 503 },
      );
    }

    logger.error('Unhandled CV API error', error);
    const fallback = getFallbackFromEnv();
    if (fallback) {
      return respond<CvResponse>(fallback, {
        status: 200,
        headers: CACHE_HEADERS,
      });
    }

    return respond<ErrorResponse>(
      { error: 'Unexpected error retrieving CV metadata.', requestId },
      { status: 500 },
    );
  }
}

function extractMeta(meta: SingletonRow['meta']): CvResponse {
  const record: CvMetaRecord | null = isRecord(meta) ? meta : null;
  const downloadUrl = typeof record?.download_url === 'string' ? record.download_url : undefined;
  const fileName =
    typeof record?.file_name === 'string' && record.file_name.trim()
      ? record.file_name
      : inferFileName(downloadUrl) || 'joe-draper-cv.pdf';
  const lastUpdated =
    typeof record?.last_updated === 'string' && record.last_updated.trim()
      ? record.last_updated
      : null;
  const fileSizeBytes = normalizeNumber(record?.file_size_bytes);
  const checksum =
    typeof record?.checksum === 'string' && record.checksum.trim() ? record.checksum : null;

  const schema = z.object({
    downloadUrl: z.string().url(),
    fileName: z.string(),
    lastUpdated: z.string().nullable(),
    fileSizeBytes: z.number().nullable(),
    checksum: z.string().nullable(),
  });

  const candidate: CvResponse = {
    downloadUrl: downloadUrl ?? '',
    fileName,
    lastUpdated,
    fileSizeBytes,
    checksum,
  };

  const parsed = schema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error('CV metadata failed validation');
  }
  return parsed.data;
}

function isRecord(value: unknown): value is CvMetaRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function inferFileName(url: string | undefined) {
  if (!url) {
    return null;
  }
  const parts = url.split('/');
  const last = parts.pop();
  if (!last) {
    return null;
  }
  try {
    return decodeURIComponent(last.split('?')[0]);
  } catch {
    return last.split('?')[0];
  }
}

function getFallbackFromEnv(): CvResponse | null {
  const downloadUrl = serverEnv.CV_FALLBACK_URL ?? CV_FALLBACK_METADATA.downloadUrl ?? null;
  if (!downloadUrl) {
    return null;
  }

  return {
    downloadUrl,
    fileName:
      serverEnv.CV_FALLBACK_FILE_NAME ||
      inferFileName(downloadUrl) ||
      CV_FALLBACK_METADATA.fileName,
    lastUpdated: serverEnv.CV_FALLBACK_LAST_UPDATED || CV_FALLBACK_METADATA.lastUpdated,
    fileSizeBytes: serverEnv.CV_FALLBACK_SIZE_BYTES ?? CV_FALLBACK_METADATA.fileSizeBytes,
    checksum: serverEnv.CV_FALLBACK_CHECKSUM || CV_FALLBACK_METADATA.checksum,
  };
}
