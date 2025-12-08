import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const setFixtureEnv = () => {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    SUPABASE_DISABLED_FOR_TESTS: 'true',
    ADMIN_E2E_FIXTURE: 'true',
  } as NodeJS.ProcessEnv;
};

beforeEach(() => {
  vi.resetModules();
  setFixtureEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
  vi.clearAllMocks();
});

describe('admin fixtures in test mode', () => {
  it('returns a fixture admin session when Supabase is disabled for tests', async () => {
    const { resolveAdminAuth } = await import('@/features/admin/app/admin-auth');

    const result = await resolveAdminAuth();

    expect(result.status).toBe('authed');
    if (result.status !== 'authed') {
      throw new Error(`Expected authed result, received ${result.status}`);
    }
    expect(result.session.kind).toBe('fixture');
    expect(result.session.userEmail).toBe('fixture-admin@example.com');
  });

  it('serves fixture responses for admin API routes without throwing', async () => {
    const { POST: createLink } = await import('@/app/api/admin/links/route');
    const payload = {
      category: 'social',
      label: 'Fixture Link',
      url: 'https://example.com',
      order: 99,
    };

    const response = await createLink(
      new Request('http://localhost/api/admin/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

    const body = await response.json();
    expect(response.status, JSON.stringify(body)).toBe(201);
    expect(body.link).toMatchObject({
      label: payload.label,
      url: payload.url,
      category: payload.category,
    });
  });
});
