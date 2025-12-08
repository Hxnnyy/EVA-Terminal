import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
const setNodeEnv = (value: string) => {
  process.env = { ...process.env, NODE_ENV: value } as NodeJS.ProcessEnv;
};

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
  vi.clearAllMocks();
});

const setBasePublicEnv = () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://site.test';
};

describe('env validation', () => {
  it('falls back to relaxed defaults outside production and logs a warning', async () => {
    setNodeEnv('test');
    process.env.NEXT_PUBLIC_SITE_URL = 'notaurl';
    const warn = vi.fn();
    vi.doMock('@/lib/logger', () => ({ createLogger: () => ({ warn }) }));

    const { env } = await import('@/lib/env');

    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('http://localhost:54321');
    expect(warn).toHaveBeenCalled();
  });

  it('throws in production when required public env vars are invalid', async () => {
    setNodeEnv('production');
    delete process.env.VITEST;
    delete process.env.SUPPRESS_ENV_VALIDATION_FOR_TESTS;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await expect(import('@/lib/env')).rejects.toThrow('Invalid public environment configuration');
  });

  it('parses server env and applies boolean/number transforms outside production', async () => {
    setNodeEnv('test');
    setBasePublicEnv();
    process.env.SUPABASE_DISABLED_FOR_TESTS = 'true';
    process.env.ADMIN_E2E_FIXTURE = 'true';
    process.env.INVESTMENTS_FETCH_ENABLED = 'false';
    process.env.INVESTMENTS_REFRESH_INTERVAL_HOURS = '12';

    const { serverEnv } = await import('@/lib/env.server');

    expect(serverEnv.SUPABASE_DISABLED_FOR_TESTS).toBe(true);
    expect(serverEnv.ADMIN_E2E_FIXTURE).toBe(true);
    expect(serverEnv.INVESTMENTS_FETCH_ENABLED).toBe(false);
    expect(serverEnv.INVESTMENTS_REFRESH_INTERVAL_HOURS).toBe(12);
    expect(serverEnv.NEXT_PUBLIC_SITE_URL).toBe('https://site.test');
  });

  it('rejects admin bypass flags when NODE_ENV=production', async () => {
    setNodeEnv('production');
    setBasePublicEnv();
    process.env.SUPABASE_DISABLED_FOR_TESTS = 'true';
    process.env.ADMIN_E2E_FIXTURE = 'true';

    await expect(import('@/lib/env.server')).rejects.toThrow(
      'Invalid server environment configuration',
    );
  });

  it('rejects invalid server-only URLs', async () => {
    setNodeEnv('production');
    setBasePublicEnv();
    process.env.ALPHAVANTAGE_ENDPOINT = 'notaurl';

    await expect(import('@/lib/env.server')).rejects.toThrow(
      'Invalid server environment configuration',
    );
  });
});
