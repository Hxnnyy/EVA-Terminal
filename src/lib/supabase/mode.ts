import { serverEnv } from '@/lib/env.server';

export type SupabaseMode = {
  disabledForTests: boolean;
  adminFixture: boolean;
};

export function getSupabaseMode(overrides?: Partial<SupabaseMode>): SupabaseMode {
  return {
    disabledForTests: overrides?.disabledForTests ?? Boolean(serverEnv.SUPABASE_DISABLED_FOR_TESTS),
    adminFixture: overrides?.adminFixture ?? Boolean(serverEnv.ADMIN_E2E_FIXTURE),
  };
}

export function isSupabaseDisabled(mode?: SupabaseMode): boolean {
  return (mode ?? getSupabaseMode()).disabledForTests;
}

export function shouldUseAdminFixture(mode?: SupabaseMode): boolean {
  const resolved = mode ?? getSupabaseMode();
  return resolved.disabledForTests && resolved.adminFixture;
}
