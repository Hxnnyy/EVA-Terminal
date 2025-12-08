'use client';

import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

export function createSupabaseBrowserClient() {
  console.log('[SupabaseBrowserClient] URL:', env.NEXT_PUBLIC_SUPABASE_URL);
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
