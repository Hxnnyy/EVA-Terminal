import 'server-only';

import type { SupabaseClient, User } from '@supabase/supabase-js';

import { ADMIN_SIGN_IN_MESSAGE, requireAdminUser } from '@/lib/auth/admin';
import { serverEnv } from '@/lib/env.server';
import { createLogger, type Logger } from '@/lib/logger';
import type { Database } from '@/lib/supabase/database.types';
import { createSupabaseServerClient, SupabaseEnvError } from '@/lib/supabase/server-client';

export type AdminSession =
  | { kind: 'fixture'; userEmail: string }
  | { kind: 'live'; supabase: SupabaseClient<Database>; user: User; userEmail: string };

export type AdminAuthResult =
  | { status: 'env-error'; message: string }
  | { status: 'unauthenticated'; message: string }
  | { status: 'forbidden'; message: string }
  | { status: 'authed'; session: AdminSession };

export async function resolveAdminAuth(
  logger: Logger = createLogger({ scope: 'admin:auth' }),
): Promise<AdminAuthResult> {
  if (serverEnv.ADMIN_E2E_FIXTURE && serverEnv.SUPABASE_DISABLED_FOR_TESTS) {
    return {
      status: 'authed',
      session: {
        kind: 'fixture',
        userEmail: 'fixture-admin@example.com',
      },
    };
  }

  let supabase: SupabaseClient<Database>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    if (error instanceof SupabaseEnvError) {
      return { status: 'env-error', message: error.message };
    }
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error while creating Supabase admin client.';
    logger.error('Failed to create Supabase admin client', error);
    return { status: 'env-error', message };
  }

  let adminGuard: Awaited<ReturnType<typeof requireAdminUser>>;
  try {
    adminGuard = await requireAdminUser(supabase);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error while verifying Supabase admin session.';
    logger.error('Admin guard failed', error);
    return { status: 'env-error', message };
  }

  if (!adminGuard.ok) {
    if (adminGuard.status === 401) {
      return { status: 'unauthenticated', message: adminGuard.message ?? ADMIN_SIGN_IN_MESSAGE };
    }
    return { status: 'forbidden', message: adminGuard.message };
  }

  const userEmail = adminGuard.user.email ?? 'Admin';

  return {
    status: 'authed',
    session: {
      kind: 'live',
      supabase,
      user: adminGuard.user,
      userEmail,
    },
  };
}
