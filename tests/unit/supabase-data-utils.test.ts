import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WRITING_FALLBACK } from '@/lib/fallbacks/writing';
import { SupabaseEnvError } from '@/lib/supabase/server-client';

const supabaseMocks = vi.hoisted(() => ({
  getSupabaseReadonlyClient: vi.fn(),
  getSupabaseServiceRoleClient: vi.fn(),
}));

const { getSupabaseReadonlyClient, getSupabaseServiceRoleClient } = supabaseMocks;

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock('@/lib/supabase/server-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/server-client')>(
    '@/lib/supabase/server-client',
  );
  return {
    ...actual,
    ...supabaseMocks,
  };
});

type SingletonRow = { body_mdx: string | null; meta: unknown };

const buildSingletonClient = (payload: SingletonRow | null, error: unknown = null) => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: payload, error }),
      }),
    }),
  }),
});

describe('Supabase data utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseReadonlyClient.mockReset();
    getSupabaseServiceRoleClient.mockReset();
  });

  it('falls back to static writing data when Supabase is disabled', async () => {
    getSupabaseReadonlyClient.mockImplementation(() => {
      throw new SupabaseEnvError('disabled for tests');
    });
    const { fetchArticleSummaries, fetchArticleBySlug } = await import('@/lib/supabase/articles');

    const summaries = await fetchArticleSummaries();
    expect(summaries).toHaveLength(WRITING_FALLBACK.length);
    expect(summaries[0]).toMatchObject({
      slug: WRITING_FALLBACK[0]!.slug,
      title: WRITING_FALLBACK[0]!.title,
    });

    const detail = await fetchArticleBySlug('prompt-1-mapping-master-v4-5');
    expect(detail).not.toBeNull();
    expect(detail?.bodyMdx).toContain('Supabase bucket-configured');
  });

  it('returns null for missing fallback article slugs', async () => {
    getSupabaseReadonlyClient.mockImplementation(() => {
      throw new SupabaseEnvError('disabled for tests');
    });
    const { fetchArticleBySlug } = await import('@/lib/supabase/articles');

    const missing = await fetchArticleBySlug('does-not-exist');
    expect(missing).toBeNull();
  });

  it('returns fallback projects when Supabase calls fail', async () => {
    getSupabaseReadonlyClient.mockImplementation(() => {
      throw new SupabaseEnvError('disabled for tests');
    });
    const { fetchProjects } = await import('@/lib/supabase/projects');
    const { PROJECTS_FALLBACK } = await import('@/lib/fallbacks/projects');

    const projects = await fetchProjects();
    expect(projects).toHaveLength(PROJECTS_FALLBACK.length);
    expect(projects[0]).toMatchObject({
      title: PROJECTS_FALLBACK[0]!.title,
      actions: PROJECTS_FALLBACK[0]!.actions,
    });
  });

  it('parses contact singleton meta when available', async () => {
    const singleton: SingletonRow = {
      body_mdx: null,
      meta: { email: 'ops@example.com', phone: '123', discord: 'eva#0101' },
    };
    getSupabaseReadonlyClient.mockReturnValue(buildSingletonClient(singleton));
    const { fetchContactInfo } = await import('@/lib/supabase/contact');

    const record = await fetchContactInfo();
    expect(record).toEqual({
      email: 'ops@example.com',
      phone: '123',
      discord: 'eva#0101',
    });
  });

  it('extracts email from body markdown when meta is empty', async () => {
    const singleton: SingletonRow = {
      body_mdx: 'Ping me at commander@gendou.jp for access.',
      meta: { note: 'missing email' },
    };
    getSupabaseReadonlyClient.mockReturnValue(buildSingletonClient(singleton));
    const { fetchContactInfo } = await import('@/lib/supabase/contact');

    const record = await fetchContactInfo();
    expect(record).toEqual({
      email: 'commander@gendou.jp',
      phone: undefined,
      discord: undefined,
    });
  });

  it('returns null when no contact email can be derived', async () => {
    const singleton: SingletonRow = { body_mdx: 'no email here', meta: {} };
    getSupabaseReadonlyClient.mockReturnValue(buildSingletonClient(singleton));
    const { fetchContactInfo } = await import('@/lib/supabase/contact');

    const record = await fetchContactInfo();
    expect(record).toBeNull();
  });
});
