import { createLogger } from '@/lib/logger';
import { getSupabaseMode, type SupabaseMode } from '@/lib/supabase/mode';

export type AdminBypassResult = {
  allowed: boolean;
  flags: string[];
  reason: 'test_env' | 'blocked_production' | 'blocked_development' | 'disabled';
};

/**
 * Determines whether admin bypass flags are allowed in the current environment.
 *
 * Admin bypass enables unauthenticated access to /admin and /api/admin routes
 * for E2E test fixtures. This must NEVER be allowed in production.
 *
 * @param options.mode - Optional Supabase mode override (for testing)
 * @param options.nodeEnv - Optional NODE_ENV override (for testing)
 * @param options.allowTestBypass - Whether to allow bypass in test environments (default: true only when NODE_ENV=test)
 * @returns Result object with allowed status, active flags, and reason
 */
export function assertAdminBypassAllowed(options?: {
  mode?: SupabaseMode;
  nodeEnv?: string;
  allowTestBypass?: boolean;
}): AdminBypassResult {
  const mode = options?.mode ?? getSupabaseMode();
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV;
  const isProd = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  const isDev = nodeEnv === 'development';

  const activeFlags: string[] = [];
  if (mode.disabledForTests) {
    activeFlags.push('SUPABASE_DISABLED_FOR_TESTS');
  }
  if (mode.adminFixture) {
    activeFlags.push('ADMIN_E2E_FIXTURE');
  }

  // No flags active = bypass is disabled
  if (activeFlags.length === 0) {
    return { allowed: false, flags: [], reason: 'disabled' };
  }

  // Production: NEVER allow bypass
  if (isProd) {
    return { allowed: false, flags: activeFlags, reason: 'blocked_production' };
  }

  // Development: warn but allow (for local fixture testing)
  if (isDev) {
    return { allowed: true, flags: activeFlags, reason: 'blocked_development' };
  }

  // Test environment: allow bypass if explicitly permitted
  if (isTest && (options?.allowTestBypass ?? true)) {
    return { allowed: true, flags: activeFlags, reason: 'test_env' };
  }

  // Default: disabled
  return { allowed: false, flags: activeFlags, reason: 'disabled' };
}

/**
 * Logs admin bypass status with appropriate severity based on the result.
 *
 * @param result - The bypass check result
 * @param context - Additional context to include in logs (e.g., request path)
 * @param requestId - Optional request ID for correlation
 */
export function logAdminBypassStatus(
  result: AdminBypassResult,
  context: { path?: string; method?: string } = {},
  requestId?: string,
): void {
  const logger = createLogger({ requestId, scope: 'security:admin-bypass' });

  switch (result.reason) {
    case 'blocked_production':
      logger.error('Admin bypass flags blocked in production', {
        ...context,
        flags: result.flags,
      });
      break;
    case 'blocked_development':
      logger.warn('Admin bypass active in development', {
        ...context,
        flags: result.flags,
      });
      break;
    case 'test_env':
      logger.info('Admin bypass active for test environment', {
        ...context,
        flags: result.flags,
      });
      break;
    case 'disabled':
      // No logging needed when bypass is disabled
      break;
  }
}

/**
 * High-level helper that checks bypass and logs in one call.
 * Returns true if bypass is allowed, false otherwise.
 */
export function isAdminBypassAllowed(
  context: { path?: string; method?: string; requestId?: string } = {},
): boolean {
  const result = assertAdminBypassAllowed();
  logAdminBypassStatus(result, { path: context.path, method: context.method }, context.requestId);
  return result.allowed;
}
