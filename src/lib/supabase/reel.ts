import 'server-only';

import { unstable_cache } from 'next/cache';

import { serverEnv } from '@/lib/env.server';
import type { Database } from '@/lib/supabase/database.types';
import { getSupabaseReadonlyClient } from '@/lib/supabase/server-client';

type ReelRow = Database['public']['Tables']['reel_images']['Row'];

type ReelImage = {
  id: string;
  url: string;
  caption: string | null;
  order: number;
};

const REEL_FETCH_LIMIT = 200;

async function fetchReelImages(): Promise<ReelImage[]> {
  if (serverEnv.SUPABASE_DISABLED_FOR_TESTS) {
    const { REEL_FALLBACK } = await import('@/lib/fallbacks/reel');
    return REEL_FALLBACK.map((item, index) => ({
      id: `fallback-reel-${index}`,
      url: item.url,
      caption: item.caption,
      order: index + 1,
    }));
  }
  const supabase = getSupabaseReadonlyClient();
  const { data, error } = await supabase
    .from('reel_images')
    .select('id, url, caption, order, created_at, updated_at')
    .order('order', { ascending: true })
    .limit(REEL_FETCH_LIMIT);

  if (error) {
    throw new Error(`Failed to load reel images: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

function mapRow(row: ReelRow): ReelImage {
  return {
    id: row.id,
    url: row.url,
    caption: row.caption,
    order: row.order ?? 0,
  };
}

export const fetchReelImagesCached = unstable_cache(fetchReelImages, ['reel:images'], {
  revalidate: 300,
  tags: ['reel'],
});
