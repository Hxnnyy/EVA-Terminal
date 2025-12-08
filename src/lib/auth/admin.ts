import type { SupabaseClient, User } from '@supabase/supabase-js';
import { headers } from 'next/headers';

import { createLogger, resolveRequestId } from '@/lib/logger';
import type { Database } from '@/lib/supabase/database.types';

const ADMIN_ROLE = 'admin';
const ADMIN_FLAG_KEYS = ['is_admin', 'isAdmin', 'admin'];

export const ADMIN_FORBIDDEN_MESSAGE =
  'You need admin access to view this area. Ask the site owner to add the admin role to your account.';
export const ADMIN_SIGN_IN_MESSAGE = 'Please sign in to continue.';

type AdminGuardResult = { ok: true; user: User } | { ok: false; status: number; message: string };

const resolveAdminRequestId = async (): Promise<string | undefined> => {
  try {
    const headerList = await headers();
    return resolveRequestId(headerList);
  } catch {
    return undefined;
  }
};

export async function requireAdminUser(
  supabase: SupabaseClient<Database>,
): Promise<AdminGuardResult> {
  const logger = createLogger({
    scope: 'auth:admin',
    requestId: await resolveAdminRequestId(),
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.warn('Failed to resolve Supabase user for admin guard', error);
    return {
      ok: false,
      status: 401,
      message: ADMIN_SIGN_IN_MESSAGE,
    };
  }

  if (!user) {
    return { ok: false, status: 401, message: ADMIN_SIGN_IN_MESSAGE };
  }

  if (!hasAdminRole(user)) {
    return { ok: false, status: 403, message: ADMIN_FORBIDDEN_MESSAGE };
  }

  return { ok: true, user };
}

export function hasAdminRole(user: User | null | undefined): user is User {
  if (!user) {
    return false;
  }

  const appMeta = toRecord(user.app_metadata);
  const userMeta = toRecord(user.user_metadata);

  const roles = normalizeRoles(appMeta.roles ?? userMeta.roles);
  const singleRole = normalizeRole(appMeta.role ?? userMeta.role);

  const hasRole = roles.includes(ADMIN_ROLE) || singleRole === ADMIN_ROLE;

  const hasFlag = ADMIN_FLAG_KEYS.some((key) => {
    return appMeta[key] === true || userMeta[key] === true;
  });

  return hasRole || hasFlag;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeRoles(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(normalizeRole).filter((role): role is string => Boolean(role));
}

function normalizeRole(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  return value.trim().toLowerCase() || null;
}
