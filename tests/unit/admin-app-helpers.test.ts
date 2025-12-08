import type { SupabaseClient, User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveAdminAuth } from '@/features/admin/app/admin-auth';
import { clearBucketStatusCache, resolveBucketStatus } from '@/features/admin/app/bucket-status';
import { loadCvMeta } from '@/features/admin/app/cv-meta';
import { loadSections } from '@/features/admin/app/section-loaders';
import { buildSummaryMetrics } from '@/features/admin/app/summary-metrics';
import type { AdminDashboardData } from '@/features/admin/types';
import type { Database } from '@/lib/supabase/database.types';
import type { StorageBucketStatus } from '@/lib/types/storage';

const { SupabaseEnvError: MockSupabaseEnvError } = vi.hoisted(() => ({
  SupabaseEnvError: class SupabaseEnvError extends Error {},
}));

const createSupabaseServerClient = vi.fn();
const requireAdminUser = vi.fn();
const ensureBucket = vi.fn();

const loadBio = vi.fn();
const loadCurrently = vi.fn();
const loadContact = vi.fn();
const loadOnepager = vi.fn();
const loadLinks = vi.fn();
const loadProjects = vi.fn();
const loadArticles = vi.fn();
const loadInvestments = vi.fn();
const loadReel = vi.fn();

vi.mock('@/lib/supabase/server-client', () => ({
  createSupabaseServerClient: (...args: unknown[]) => createSupabaseServerClient(...args),
  SupabaseEnvError: MockSupabaseEnvError,
}));

vi.mock('@/lib/auth/admin', () => ({
  requireAdminUser: (...args: unknown[]) => requireAdminUser(...args),
  ADMIN_SIGN_IN_MESSAGE: 'Please sign in to continue.',
}));

vi.mock('@/features/admin/server/storage', () => ({
  ensureBucket: (...args: unknown[]) => ensureBucket(...args),
}));

vi.mock('@/features/admin/server/data/content', () => ({
  loadBio: (...args: unknown[]) => loadBio(...args),
  loadCurrently: (...args: unknown[]) => loadCurrently(...args),
  loadContact: (...args: unknown[]) => loadContact(...args),
  loadOnepager: (...args: unknown[]) => loadOnepager(...args),
}));

vi.mock('@/features/admin/server/data/collections', () => ({
  loadLinks: (...args: unknown[]) => loadLinks(...args),
  loadProjects: (...args: unknown[]) => loadProjects(...args),
  loadArticles: (...args: unknown[]) => loadArticles(...args),
  loadReel: (...args: unknown[]) => loadReel(...args),
}));

vi.mock('@/features/admin/server/data/investments', () => ({
  loadInvestments: (...args: unknown[]) => loadInvestments(...args),
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn: unknown) => fn),
  unstable_noStore: vi.fn(),
}));

const user = { id: 'user-1', email: 'admin@example.com' } as User;

const bioSnapshot = { rawBody: 'bio', warnings: [], sections: [], updatedAt: null };
const currentlySnapshot = { sections: [], warnings: [], updatedAt: null, rawBody: 'currently' };
const contactRecord = { email: 'admin@example.com', phone: null, discord: null };
const linksData = [
  { id: 'l1', category: 'site' as const, label: 'Site', url: 'https://example.com', order: 1 },
];
const projectsData = [
  {
    id: 'p1',
    slug: 'project',
    title: 'Project',
    blurb: null,
    url: null,
    tags: [],
    order: 1,
  },
];
const articlesData = [
  {
    id: 'a1',
    slug: 'post',
    title: 'Post',
    subtitle: null,
    status: 'published' as const,
    updatedAt: null,
    bodyMdx: 'mdx',
  },
];
const investmentsData = [
  {
    id: 'inv-1',
    ticker: 'SPY',
    label: null,
    order: 1,
    provider: 'stooq' as const,
    providerSymbol: null,
    perf6mPercent: null,
    perfLastFetched: '2025-01-01T00:00:00.000Z',
  },
];
const reelData = [{ id: 'r1', url: 'https://example.com/r1.jpg', caption: null, order: 1 }];
const onepagerData = { rawBody: '# Test', meta: null };

beforeEach(() => {
  vi.clearAllMocks();
  createSupabaseServerClient.mockResolvedValue({} as SupabaseClient<Database>);
  requireAdminUser.mockResolvedValue({ ok: true, user });
  ensureBucket.mockResolvedValue({
    name: 'bucket',
    ok: true,
    created: false,
  } satisfies StorageBucketStatus);
  clearBucketStatusCache();

  loadBio.mockResolvedValue({ status: 'ok', data: bioSnapshot });
  loadCurrently.mockResolvedValue({ status: 'ok', data: currentlySnapshot });
  loadContact.mockResolvedValue({ status: 'ok', data: contactRecord });
  loadOnepager.mockResolvedValue({ status: 'ok', data: onepagerData });
  loadLinks.mockResolvedValue({ status: 'ok', data: linksData });
  loadProjects.mockResolvedValue({ status: 'ok', data: projectsData });
  loadArticles.mockResolvedValue({ status: 'ok', data: articlesData });
  loadInvestments.mockResolvedValue({ status: 'ok', data: investmentsData });
  loadReel.mockResolvedValue({ status: 'ok', data: reelData });
});

describe('resolveAdminAuth', () => {
  it('returns unauthenticated when Supabase session is missing', async () => {
    requireAdminUser.mockResolvedValueOnce({ ok: false, status: 401, message: 'no session' });

    const result = await resolveAdminAuth();

    expect(result).toMatchObject({ status: 'unauthenticated', message: 'no session' });
  });

  it('returns forbidden when user lacks admin role', async () => {
    requireAdminUser.mockResolvedValueOnce({ ok: false, status: 403, message: 'not admin' });

    const result = await resolveAdminAuth();

    expect(result).toMatchObject({ status: 'forbidden', message: 'not admin' });
  });

  it('surfaces env error when Supabase client cannot be created', async () => {
    createSupabaseServerClient.mockRejectedValueOnce(new MockSupabaseEnvError('missing env vars'));

    const result = await resolveAdminAuth();

    expect(result).toMatchObject({ status: 'env-error', message: 'missing env vars' });
  });

  it('returns authed with Supabase client and user email when guard passes', async () => {
    const result = await resolveAdminAuth();

    expect(result.status).toBe('authed');
    if (result.status !== 'authed') return;
    expect(result.session.kind).toBe('live');
    if (result.session.kind !== 'live') return;
    expect(result.session.supabase).toBeDefined();
    expect(result.session.userEmail).toBe(user.email);
  });
});

describe('resolveBucketStatus', () => {
  it('collects warnings when a bucket check fails', async () => {
    ensureBucket
      .mockResolvedValueOnce({ name: 'reel', ok: false, created: false, message: 'offline' })
      .mockResolvedValueOnce({ name: 'cv', ok: true, created: false });

    const result = await resolveBucketStatus();

    expect(result.ok).toBe(false);
    expect(result.bucketStatuses).toHaveLength(3);
    expect(result.warnings[0]).toContain('reel');
    expect(result.reelBucketStatus?.ok).toBe(false);
  });
});

describe('loadSections', () => {
  it('marks failed sections and keeps fallback data when a loader returns an error status', async () => {
    loadLinks.mockResolvedValueOnce({ status: 'error', data: [], message: 'links offline' });

    const result = await loadSections({} as SupabaseClient<Database>);

    expect(result.ok).toBe(false);
    expect(result.failedSections).toEqual(['links']);
    expect(result.sections.links.status).toBe('error');
    expect(result.sections.links.data).toEqual([]);
    expect(result.warnings[0]).toContain('Links panel is using fallback data: links offline');
  });

  it('can force a section failure via ADMIN_FORCE_SECTION_FAILURE for drills', async () => {
    const original = process.env.ADMIN_FORCE_SECTION_FAILURE;
    process.env.ADMIN_FORCE_SECTION_FAILURE = 'articles';

    const result = await loadSections({} as SupabaseClient<Database>);

    expect(result.ok).toBe(false);
    expect(result.failedSections).toContain('articles');
    expect(result.sections.articles.status).toBe('error');

    process.env.ADMIN_FORCE_SECTION_FAILURE = original;
  });
});

describe('loadCvMeta', () => {
  it('returns an error result instead of throwing when Supabase select fails', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: new Error('cv missing') }),
          }),
        }),
      }),
    } as unknown as SupabaseClient<Database>;

    const result = await loadCvMeta(supabase);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorMessage).toContain('cv missing');
    expect(result.data).toBeNull();
  });
});

describe('buildSummaryMetrics', () => {
  it('formats counts and tones based on bucket status and CV metadata', () => {
    const sections: AdminDashboardData['sections'] = {
      bio: { status: 'ok', data: bioSnapshot },
      currently: { status: 'ok', data: currentlySnapshot },
      contact: { status: 'ok', data: contactRecord },
      links: { status: 'ok', data: linksData },
      projects: { status: 'ok', data: projectsData },
      articles: { status: 'ok', data: articlesData },
      investments: { status: 'ok', data: investmentsData },
      reel: { status: 'ok', data: reelData },
      onepager: { status: 'ok', data: onepagerData },
    };

    const reelBucketStatus: StorageBucketStatus = {
      name: 'reel',
      ok: false,
      created: false,
      message: 'Bucket missing',
    };
    const cvBucketStatus: StorageBucketStatus = {
      name: 'cv',
      ok: true,
      created: false,
      message: 'Upload a PDF to begin',
    };

    const { metrics, lastInvestmentFetch } = buildSummaryMetrics({
      sections: {
        links: sections.links,
        projects: sections.projects,
        articles: sections.articles,
        reel: sections.reel,
        investments: sections.investments,
      },
      reelBucketStatus,
      cvBucketStatus,
      cvMeta: null,
    });

    const reelMetric = metrics.find((metric) => metric.label === 'Reels');
    const cvMetric = metrics.find((metric) => metric.label === 'CV');
    const investmentsMetric = metrics.find((metric) => metric.label === 'Investments');

    expect(reelMetric?.tone).toBe('success');
    expect(reelMetric?.meta).toContain('Reels Configured');
    expect(cvMetric?.tone).toBe('warning');
    expect(cvMetric?.meta).toBe('CV Not Configured');
    expect(investmentsMetric?.meta).toBe('Investments Configured - Refreshed Jan 1, 2025');
    expect(lastInvestmentFetch).toBe(investmentsData[0].perfLastFetched);
  });
});
