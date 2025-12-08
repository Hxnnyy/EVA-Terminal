import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const setNodeEnv = (value: string) => {
  process.env = { ...process.env, NODE_ENV: value } as NodeJS.ProcessEnv;
};

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv } as NodeJS.ProcessEnv;
});

afterEach(() => {
  process.env = { ...originalEnv } as NodeJS.ProcessEnv;
  vi.resetModules();
  vi.clearAllMocks();
});

const mockLogger = () => {
  const debug = vi.fn();
  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();

  vi.doMock('@/lib/logger', () => ({
    createLogger: () => ({
      requestId: 'test-request-id',
      debug,
      info,
      warn,
      error,
      child: () => ({ requestId: 'test-request-id', debug, info, warn, error, child: vi.fn() }),
    }),
  }));

  return { debug, info, warn, error };
};

const mockSupabaseMode = (mode: { disabledForTests: boolean; adminFixture: boolean }) => {
  vi.doMock('@/lib/supabase/mode', () => ({
    getSupabaseMode: () => mode,
  }));
};

describe('admin-bypass helper', () => {
  describe('assertAdminBypassAllowed', () => {
    it('returns disabled when no flags are set', async () => {
      setNodeEnv('test');
      mockLogger();
      mockSupabaseMode({ disabledForTests: false, adminFixture: false });

      const { assertAdminBypassAllowed } = await import('@/lib/security/admin-bypass');
      const result = assertAdminBypassAllowed();

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('disabled');
      expect(result.flags).toEqual([]);
    });

    it('allows bypass in test environment when flags are set', async () => {
      setNodeEnv('test');
      mockLogger();
      mockSupabaseMode({ disabledForTests: true, adminFixture: false });

      const { assertAdminBypassAllowed } = await import('@/lib/security/admin-bypass');
      const result = assertAdminBypassAllowed();

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('test_env');
      expect(result.flags).toContain('SUPABASE_DISABLED_FOR_TESTS');
    });

    it('blocks bypass in production even when flags are set', async () => {
      // Use mode override to avoid env.server validation throwing
      setNodeEnv('test');
      mockLogger();
      mockSupabaseMode({ disabledForTests: true, adminFixture: true });

      const { assertAdminBypassAllowed } = await import('@/lib/security/admin-bypass');
      // Pass nodeEnv override to simulate production check without triggering env validation
      const result = assertAdminBypassAllowed({ nodeEnv: 'production' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('blocked_production');
      expect(result.flags).toContain('SUPABASE_DISABLED_FOR_TESTS');
      expect(result.flags).toContain('ADMIN_E2E_FIXTURE');
    });

    it('allows bypass in development with warning reason', async () => {
      setNodeEnv('test');
      mockLogger();
      mockSupabaseMode({ disabledForTests: false, adminFixture: true });

      const { assertAdminBypassAllowed } = await import('@/lib/security/admin-bypass');
      // Pass nodeEnv override to simulate development mode
      const result = assertAdminBypassAllowed({ nodeEnv: 'development' });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('blocked_development');
      expect(result.flags).toContain('ADMIN_E2E_FIXTURE');
    });

    it('respects mode override option', async () => {
      setNodeEnv('test');
      mockLogger();
      mockSupabaseMode({ disabledForTests: false, adminFixture: false });

      const { assertAdminBypassAllowed } = await import('@/lib/security/admin-bypass');
      const result = assertAdminBypassAllowed({
        mode: { disabledForTests: true, adminFixture: false },
        nodeEnv: 'production',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('blocked_production');
      expect(result.flags).toContain('SUPABASE_DISABLED_FOR_TESTS');
    });
  });

  describe('logAdminBypassStatus', () => {
    it('logs error for blocked_production reason', async () => {
      setNodeEnv('test');
      const logger = mockLogger();
      mockSupabaseMode({ disabledForTests: false, adminFixture: false });

      const { logAdminBypassStatus } = await import('@/lib/security/admin-bypass');

      logAdminBypassStatus(
        { allowed: false, flags: ['SUPABASE_DISABLED_FOR_TESTS'], reason: 'blocked_production' },
        { path: '/admin' },
      );

      expect(logger.error).toHaveBeenCalledWith('Admin bypass flags blocked in production', {
        path: '/admin',
        flags: ['SUPABASE_DISABLED_FOR_TESTS'],
      });
    });

    it('logs warning for blocked_development reason', async () => {
      setNodeEnv('test');
      const logger = mockLogger();
      mockSupabaseMode({ disabledForTests: false, adminFixture: false });

      const { logAdminBypassStatus } = await import('@/lib/security/admin-bypass');

      logAdminBypassStatus(
        { allowed: true, flags: ['ADMIN_E2E_FIXTURE'], reason: 'blocked_development' },
        { path: '/api/admin/links' },
      );

      expect(logger.warn).toHaveBeenCalledWith('Admin bypass active in development', {
        path: '/api/admin/links',
        flags: ['ADMIN_E2E_FIXTURE'],
      });
    });

    it('logs info for test_env reason', async () => {
      setNodeEnv('test');
      const logger = mockLogger();
      mockSupabaseMode({ disabledForTests: false, adminFixture: false });

      const { logAdminBypassStatus } = await import('@/lib/security/admin-bypass');

      logAdminBypassStatus(
        { allowed: true, flags: ['SUPABASE_DISABLED_FOR_TESTS'], reason: 'test_env' },
        { path: '/admin' },
      );

      expect(logger.info).toHaveBeenCalledWith('Admin bypass active for test environment', {
        path: '/admin',
        flags: ['SUPABASE_DISABLED_FOR_TESTS'],
      });
    });

    it('does not log for disabled reason', async () => {
      setNodeEnv('test');
      const logger = mockLogger();
      mockSupabaseMode({ disabledForTests: false, adminFixture: false });

      const { logAdminBypassStatus } = await import('@/lib/security/admin-bypass');

      logAdminBypassStatus({ allowed: false, flags: [], reason: 'disabled' }, { path: '/admin' });

      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('isAdminBypassAllowed', () => {
    it('returns true when bypass is allowed and logs status', async () => {
      setNodeEnv('test');
      const logger = mockLogger();
      mockSupabaseMode({ disabledForTests: true, adminFixture: false });

      const { isAdminBypassAllowed } = await import('@/lib/security/admin-bypass');
      const result = isAdminBypassAllowed({ path: '/admin', requestId: 'test-123' });

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalled();
    });

    it('returns false when bypass is disabled', async () => {
      setNodeEnv('test');
      const logger = mockLogger();
      mockSupabaseMode({ disabledForTests: false, adminFixture: false });

      const { isAdminBypassAllowed } = await import('@/lib/security/admin-bypass');
      const result = isAdminBypassAllowed({ path: '/admin' });

      expect(result).toBe(false);
      // No logging for disabled reason
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});
