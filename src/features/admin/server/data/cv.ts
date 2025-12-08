import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';

import type { Database } from '@/lib/supabase/database.types';

import type { CvMeta } from '../../types';

type CvMetaResult =
  | { status: 'ok'; data: CvMeta }
  | { status: 'error'; data: CvMeta; message: string };

export async function loadCvMeta(supabase: SupabaseClient<Database>): Promise<CvMetaResult> {
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
    return { status: 'ok', data: meta };
  } catch (error) {
    return {
      status: 'error',
      data: null,
      message: error instanceof Error ? error.message : 'Unable to load CV metadata.',
    };
  }
}
