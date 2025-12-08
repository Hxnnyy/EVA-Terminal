import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { serverEnv } from '@/lib/env.server';
import type { Database } from '@/lib/supabase/database.types';
import { getSupabaseMode, isSupabaseDisabled, type SupabaseMode } from '@/lib/supabase/mode';
import { ensureFixtureClient } from '@/lib/supabase/server-client';

export class SupabaseServiceRoleError extends Error {
  constructor(message?: string) {
    super(
      message ??
        'Supabase service role key (SUPABASE_SERVICE_ROLE) must be configured to perform this action.',
    );
    this.name = 'SupabaseServiceRoleError';
  }
}

let client: SupabaseClient<Database> | null = null;

export function getSupabaseServiceRoleClient(mode: SupabaseMode = getSupabaseMode()) {
  if (isSupabaseDisabled(mode)) {
    return ensureFixtureClient(mode);
  }

  if (!serverEnv.NEXT_PUBLIC_SUPABASE_URL || !serverEnv.SUPABASE_SERVICE_ROLE) {
    throw new SupabaseServiceRoleError();
  }

  if (client && (client as { __isFixture?: boolean }).__isFixture) {
    client = null;
  }

  if (!client) {
    client = createClient<Database>(
      serverEnv.NEXT_PUBLIC_SUPABASE_URL,
      serverEnv.SUPABASE_SERVICE_ROLE,
      {
        auth: {
          persistSession: false,
        },
      },
    );
  }

  return client;
}
