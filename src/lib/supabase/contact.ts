import 'server-only';

import { unstable_cache } from 'next/cache';

import { serverEnv } from '@/lib/env.server';
import { getSupabaseReadonlyClient, SupabaseEnvError } from '@/lib/supabase/server-client';

export type ContactRecord = {
  email: string;
  phone?: string | null;
  discord?: string | null;
};

export async function fetchContactInfo(): Promise<ContactRecord | null> {
  try {
    const supabase = getSupabaseReadonlyClient();
    const { data, error } = await supabase
      .from('singletons')
      .select('body_mdx, meta')
      .eq('key', 'contact')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load contact singleton: ${error.message}`);
    }

    const meta = isContactMeta(data?.meta) ? data.meta : null;
    const email =
      typeof meta?.email === 'string' ? meta.email : extractEmailFromBody(data?.body_mdx ?? '');

    if (!email) {
      return null;
    }

    return {
      email,
      phone: typeof meta?.phone === 'string' ? meta.phone : undefined,
      discord:
        typeof meta?.discord === 'string'
          ? meta.discord
          : typeof meta?.signal === 'string'
            ? meta.signal
            : undefined,
    };
  } catch (error) {
    if (serverEnv.SUPABASE_DISABLED_FOR_TESTS && error instanceof SupabaseEnvError) {
      return null;
    }
    throw error;
  }
}

function extractEmailFromBody(body: string): string | null {
  const match = body.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function isContactMeta(
  value: unknown,
): value is { email?: string; phone?: string; discord?: string; signal?: string } {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export const fetchContactInfoCached = unstable_cache(fetchContactInfo, ['contact:singleton'], {
  revalidate: 300,
  tags: ['contact', 'singletons'],
});
