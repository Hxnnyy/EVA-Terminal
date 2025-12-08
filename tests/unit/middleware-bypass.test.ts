import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Define locally to avoid importing the module before mocks are set up
type AdminBypassResult = {
  allowed: boolean;
  flags: string[];
  reason: 'test_env' | 'blocked_production' | 'blocked_development' | 'disabled';
};

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

const setupMocks = (options: {
  bypassResult: AdminBypassResult;
  supabaseUser?: { id: string; app_metadata?: Record<string, unknown> } | null;
}) => {
  const debug = vi.fn();
  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();
  const logger = { debug, info, warn, error };

  // Mock logger - this is used by middleware directly
  vi.doMock('@/lib/logger', () => ({
    createLogger: () => ({
      requestId: 'test-request-id',
      debug,
      info,
      warn,
      error,
      child: () => ({ requestId: 'test-request-id', debug, info, warn, error, child: vi.fn() }),
    }),
    attachRequestIdHeader: (response: Response, requestId: string) => {
      response.headers.set('x-request-id', requestId);
      return response;
    },
    REQUEST_ID_HEADER: 'x-request-id',
  }));

  // Mock CSP builder
  vi.doMock('@/lib/security/csp', () => ({
    buildCspHeaders: () => ({ csp: '', headers: [] }),
  }));

  // Mock env.server to avoid validation errors
  vi.doMock('@/lib/env.server', () => ({
    serverEnv: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  }));

  // Mock the admin bypass helper directly - log calls will use the captured fns above
  vi.doMock('@/lib/security/admin-bypass', () => ({
    assertAdminBypassAllowed: () => options.bypassResult,
    logAdminBypassStatus: (
      result: AdminBypassResult,
      context: { path?: string; method?: string },
    ) => {
      switch (result.reason) {
        case 'blocked_production':
          error('Admin bypass flags blocked in production', { ...context, flags: result.flags });
          break;
        case 'blocked_development':
          warn('Admin bypass active in development', { ...context, flags: result.flags });
          break;
        case 'test_env':
          info('Admin bypass active for test environment', { ...context, flags: result.flags });
          break;
      }
    },
  }));

  // Mock Supabase client if needed
  if (options.supabaseUser !== undefined) {
    vi.doMock('@supabase/ssr', () => ({
      createServerClient: () => ({
        auth: {
          getUser: () =>
            Promise.resolve({
              data: { user: options.supabaseUser },
            }),
        },
      }),
    }));
  }

  return logger;
};

describe('middleware admin bypass flags', () => {
  it('allows bypass in test environment and logs info status', async () => {
    setNodeEnv('test');
    const logger = setupMocks({
      bypassResult: {
        allowed: true,
        flags: ['SUPABASE_DISABLED_FOR_TESTS'],
        reason: 'test_env',
      },
    });

    const { middleware } = await import('@/middleware');
    const request = new NextRequest('http://localhost/admin');

    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');

    // The middleware now uses the centralized admin-bypass helper
    // Debug: log all calls to understand what's happening
    const infoCalls = logger.info.mock.calls;
    // We expect at least the bypass status log
    expect(infoCalls.length).toBeGreaterThan(0);

    // Find the bypass log call
    const bypassCall = infoCalls.find(
      (call) => call[0] === 'Admin bypass active for test environment',
    );
    expect(bypassCall).toBeDefined();
    expect(bypassCall?.[1]).toEqual({
      path: '/admin',
      method: 'GET',
      flags: ['SUPABASE_DISABLED_FOR_TESTS'],
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('blocks bypass flags in production with a 403', async () => {
    setNodeEnv('production');
    const logger = setupMocks({
      bypassResult: {
        allowed: false,
        flags: ['SUPABASE_DISABLED_FOR_TESTS'],
        reason: 'blocked_production',
      },
    });

    const { middleware } = await import('@/middleware');
    const request = new NextRequest('http://localhost/admin');

    const response = await middleware(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(payload.error).toContain('disabled in production');

    // Find the bypass log call
    const errorCalls = logger.error.mock.calls;
    const bypassCall = errorCalls.find(
      (call) => call[0] === 'Admin bypass flags blocked in production',
    );
    expect(bypassCall).toBeDefined();
    expect(bypassCall?.[1]).toEqual({
      path: '/admin',
      method: 'GET',
      flags: ['SUPABASE_DISABLED_FOR_TESTS'],
    });
  });

  it('proceeds with auth check when bypass is disabled', async () => {
    setNodeEnv('test');
    setupMocks({
      bypassResult: {
        allowed: false,
        flags: [],
        reason: 'disabled',
      },
      supabaseUser: null,
    });

    const { middleware } = await import('@/middleware');
    const request = new NextRequest('http://localhost/admin');

    const response = await middleware(request);

    // Middleware now returns 200 and lets AdminAuthGate handle the login modal
    // (no redirect to login page anymore)
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('allows bypass in development with warning', async () => {
    setNodeEnv('development');
    const logger = setupMocks({
      bypassResult: {
        allowed: true,
        flags: ['ADMIN_E2E_FIXTURE'],
        reason: 'blocked_development',
      },
    });

    const { middleware } = await import('@/middleware');
    const request = new NextRequest('http://localhost/admin');

    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');

    // Find the bypass log call
    const warnCalls = logger.warn.mock.calls;
    const bypassCall = warnCalls.find((call) => call[0] === 'Admin bypass active in development');
    expect(bypassCall).toBeDefined();
    expect(bypassCall?.[1]).toEqual({
      path: '/admin',
      method: 'GET',
      flags: ['ADMIN_E2E_FIXTURE'],
    });
  });
});
