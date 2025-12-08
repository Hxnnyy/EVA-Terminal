import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';

import type { CvMeta } from '@/features/admin/types';
import { createLogger, type Logger } from '@/lib/logger';
import type { Database } from '@/lib/supabase/database.types';

export type CvMetaResult =
  | { ok: true; data: CvMeta }
  | { ok: false; data: CvMeta; errorMessage: string };

export async function loadCvMeta(
  supabase: SupabaseClient<Database>,
  logger: Logger = createLogger({ scope: 'admin:cv-meta' }),
): Promise<CvMetaResult> {
  noStore();
  try {
    const { data, error } = await supabase
      .from('singletons')
      .select('meta')
      .eq('key', 'cv_meta')
      .maybeSingle();

    if (error) {
      throw error;
    }

    const meta = (data?.meta as CvMeta) ?? null;
    return { ok: true, data: meta };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load CV metadata. Please retry.';
    logger.warn('Failed to load CV metadata', error);
    return { ok: false, data: null, errorMessage: message };
  }
}
