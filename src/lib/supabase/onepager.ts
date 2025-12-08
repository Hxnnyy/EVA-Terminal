import 'server-only';

import { unstable_cache } from 'next/cache';

import { serverEnv } from '@/lib/env.server';
import { ONEPAGER_FALLBACK } from '@/lib/fallbacks/onepager';
import { getSupabaseReadonlyClient, SupabaseEnvError } from '@/lib/supabase/server-client';

export type OnepagerMeta = {
  title?: string;
  subtitle?: string;
};

export type OnepagerRecord = {
  bodyMdx: string;
  meta: OnepagerMeta;
  updatedAt: string;
};

export async function fetchOnepager(): Promise<OnepagerRecord | null> {
  try {
    const supabase = getSupabaseReadonlyClient();
    const { data, error } = await supabase
      .from('singletons')
      .select('body_mdx, meta, updated_at')
      .eq('key', 'onepager')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load onepager singleton: ${error.message}`);
    }

    if (!data) {
      return ONEPAGER_FALLBACK;
    }

    const meta = isOnepagerMeta(data.meta) ? data.meta : {};

    return {
      bodyMdx: data.body_mdx ?? '',
      meta,
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  } catch (error) {
    if (serverEnv.SUPABASE_DISABLED_FOR_TESTS && error instanceof SupabaseEnvError) {
      return ONEPAGER_FALLBACK;
    }
    throw error;
  }
}

export function isOnepagerMeta(value: unknown): value is OnepagerMeta {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export const fetchOnepagerCached = unstable_cache(fetchOnepager, ['onepager:singleton'], {
  revalidate: 300,
  tags: ['onepager', 'singletons'],
});
