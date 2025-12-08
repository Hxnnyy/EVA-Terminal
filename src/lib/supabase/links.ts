import 'server-only';

import { unstable_cache } from 'next/cache';

import { serverEnv } from '@/lib/env.server';
import type { Database } from '@/lib/supabase/database.types';
import { getSupabaseReadonlyClient } from '@/lib/supabase/server-client';

type LinkRow = Database['public']['Tables']['links']['Row'];

export type LinkRecord = {
  id: string;
  category: LinkRow['category'];
  label: string;
  url: string;
  order: number;
};

const LINKS_FETCH_LIMIT = 200;

async function fetchLinks(): Promise<LinkRecord[]> {
  if (serverEnv.SUPABASE_DISABLED_FOR_TESTS) {
    const { LINKS_FALLBACK } = await import('@/lib/fallbacks/links');
    return LINKS_FALLBACK.map((link) => ({ ...link }));
  }
  const supabase = getSupabaseReadonlyClient();
  const { data, error } = await supabase
    .from('links')
    .select('id, category, label, url, order, created_at, updated_at')
    .order('order', { ascending: true })
    .limit(LINKS_FETCH_LIMIT);

  if (error) {
    throw new Error(`Failed to load links: ${error.message}`);
  }

  return (data ?? []).map(mapLinkRow);
}

function mapLinkRow(row: LinkRow): LinkRecord {
  return {
    id: row.id,
    category: row.category,
    label: row.label,
    url: row.url,
    order: row.order ?? 0,
  };
}

export const fetchLinksCached = unstable_cache(fetchLinks, ['links:list'], {
  revalidate: 300,
  tags: ['links'],
});
