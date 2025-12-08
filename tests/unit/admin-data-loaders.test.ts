import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadArticles,
  loadLinks,
  loadProjects,
  loadReel,
} from '@/features/admin/server/data/collections';
import { loadBio, loadContact, loadCurrently } from '@/features/admin/server/data/content';
import { loadCvMeta } from '@/features/admin/server/data/cv';
import { loadInvestments } from '@/features/admin/server/data/investments';
import { INVESTMENTS_FALLBACK } from '@/lib/fallbacks/investments';
import { LINKS_FALLBACK } from '@/lib/fallbacks/links';
import { REEL_FALLBACK } from '@/lib/fallbacks/reel';
import { WRITING_FALLBACK } from '@/lib/fallbacks/writing';
import type { Database } from '@/lib/supabase/database.types';

const noStore = vi.fn();
const fetchBioSingleton = vi.fn();
const parseBioSingletonRow = vi.fn();
const fetchCurrentlySnapshot = vi.fn();
const fetchContactInfo = vi.fn();

vi.mock('next/cache', () => ({
  unstable_noStore: (...args: unknown[]) => {
    noStore(...args);
  },
  unstable_cache: vi.fn((fn: unknown) => fn),
}));

vi.mock('@/features/terminal/lib/commands/bio.server', () => ({
  fetchBioSingleton: (...args: unknown[]) => fetchBioSingleton(...args),
  parseBioSingletonRow: (...args: unknown[]) => parseBioSingletonRow(...args),
}));

vi.mock('@/features/terminal/lib/commands/currently.server', () => ({
  fetchCurrentlySnapshot: (...args: unknown[]) => fetchCurrentlySnapshot(...args),
}));

vi.mock('@/lib/supabase/contact', () => ({
  fetchContactInfo: (...args: unknown[]) => fetchContactInfo(...args),
}));

type ErrorCapable<T> = { status: 'ok'; data: T } | { status: 'error'; data: T; message: string };
const expectErrorState = <T>(state: ErrorCapable<T>) => {
  expect(state.status).toBe('error');
  if (state.status !== 'error') {
    throw new Error('Expected error state');
  }
  return state;
};

type QueryResult<T> = { data?: T; error?: Error | null };

const createSupabaseClient = <T>(result: QueryResult<T>): SupabaseClient<Database> => {
  const query = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return {
    from: vi.fn().mockReturnValue(query),
  } as unknown as SupabaseClient<Database>;
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchBioSingleton.mockResolvedValue({
    rawBody: 'bio-body',
    warnings: [],
    sections: [],
    updatedAt: '2025-01-01T00:00:00.000Z',
  });
  parseBioSingletonRow.mockImplementation(
    (row: { body_mdx?: string; updated_at?: string | null }) => ({
      rawBody: row.body_mdx ?? '',
      warnings: [],
      sections: [],
      updatedAt: row.updated_at ?? null,
    }),
  );
  fetchCurrentlySnapshot.mockResolvedValue({
    sections: [],
    warnings: ['ok'],
    updatedAt: '2025-01-01T00:00:00.000Z',
    rawBody: 'currently',
  });
  fetchContactInfo.mockResolvedValue({
    email: 'admin@example.com',
    phone: '+1-555-0100',
    discord: null,
  });
});

describe('admin data loaders', () => {
  it('returns Supabase links and disables caching', async () => {
    const supabase = createSupabaseClient({
      data: [
        {
          id: '1',
          category: 'social',
          label: 'Site',
          url: 'https://example.com',
          order: 2,
          created_at: null,
          updated_at: null,
        },
      ],
      error: null,
    });

    const result = await loadLinks(supabase);

    expect(noStore).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('ok');
    expect(result.data[0]).toMatchObject({
      id: '1',
      category: 'social',
      label: 'Site',
      url: 'https://example.com',
      order: 2,
    });
  });

  it('falls back to cached link data when Supabase errors', async () => {
    const supabase = createSupabaseClient({ data: null, error: new Error('links offline') });

    const result = await loadLinks(supabase);

    const errored = expectErrorState(result);
    expect(errored.data).toHaveLength(LINKS_FALLBACK.length);
    expect(errored.message).toContain('links offline');
  });

  it('maps projects rows and preserves tags', async () => {
    const supabase = createSupabaseClient({
      data: [
        {
          id: 'p1',
          slug: 'proj',
          title: 'Project',
          blurb: 'desc',
          url: 'https://example.com',
          tags: ['react', 42],
          order: 5,
        },
      ],
      error: null,
    });

    const result = await loadProjects(supabase);

    expect(result.status).toBe('ok');
    expect(result.data[0]).toMatchObject({
      id: 'p1',
      slug: 'proj',
      title: 'Project',
      blurb: 'desc',
      url: 'https://example.com',
      tags: ['react'],
      order: 5,
    });
  });

  it('uses writing fallback when articles fail to load', async () => {
    const supabase = createSupabaseClient({ data: null, error: new Error('articles down') });

    const result = await loadArticles(supabase);

    const errored = expectErrorState(result);
    expect(errored.data[0].slug).toBe(WRITING_FALLBACK[0].slug);
    expect(errored.message).toContain('articles down');
  });

  it('uses reel fallback when Supabase throws', async () => {
    const supabase = createSupabaseClient({ data: null, error: new Error('reel broken') });

    const result = await loadReel(supabase);

    const errored = expectErrorState(result);
    expect(errored.data[0].url).toBe(REEL_FALLBACK[0].url);
    expect(errored.message).toContain('reel broken');
  });

  it('loads bio and currently snapshots via singleton fetchers', async () => {
    const bio = await loadBio();
    const currently = await loadCurrently();

    expect(noStore).toHaveBeenCalledTimes(2);
    expect(bio.status).toBe('ok');
    expect(currently.status).toBe('ok');
    expect(fetchBioSingleton).toHaveBeenCalled();
    expect(fetchCurrentlySnapshot).toHaveBeenCalled();
  });

  it('falls back to parsed bio copy when singleton fails', async () => {
    fetchBioSingleton.mockRejectedValueOnce(new Error('bio missing'));

    const bio = await loadBio();

    expect(bio.status).toBe('error');
    if (bio.status !== 'error') {
      throw new Error('Expected bio error state');
    }
    expect(parseBioSingletonRow).toHaveBeenCalled();
    expect(bio.message).toContain('bio missing');
  });

  it('returns contact fallback when missing', async () => {
    fetchContactInfo.mockResolvedValueOnce(null);

    const contact = await loadContact();

    const errored = expectErrorState(contact);
    expect(errored.data.email).toBeDefined();
    expect(errored.message).toContain('Contact singleton missing');
  });

  it('surfaces contact error messages', async () => {
    fetchContactInfo.mockRejectedValueOnce(new Error('contact offline'));

    const contact = await loadContact();

    const errored = expectErrorState(contact);
    expect(errored.message).toContain('contact offline');
  });

  it('returns CV meta when Supabase returns data', async () => {
    const supabase = createSupabaseClient({
      data: { meta: { download_url: 'https://example.com/cv.pdf', file_name: 'cv.pdf' } },
      error: null,
    });

    const result = await loadCvMeta(supabase);

    expect(noStore).toHaveBeenCalled();
    expect(result.status).toBe('ok');
    expect(result.data?.file_name).toBe('cv.pdf');
  });

  it('returns CV error state when query fails', async () => {
    const supabase = createSupabaseClient({ data: null, error: new Error('cv missing') });

    const result = await loadCvMeta(supabase);

    const errored = expectErrorState(result);
    expect(errored.message).toContain('cv missing');
  });

  it('normalizes investment providers and falls back on errors', async () => {
    const supabase = createSupabaseClient({
      data: [
        {
          id: 'inv-1',
          ticker: 'SPY',
          label: 'S&P 500',
          order: 1,
          provider: 'alphavantage',
          provider_symbol: 'SPY',
          perf_6m_percent: 12.5,
          perf_last_fetched: '2025-01-01T00:00:00.000Z',
          created_at: null,
          updated_at: null,
        },
      ],
      error: null,
    });

    const result = await loadInvestments(supabase);

    expect(noStore).toHaveBeenCalled();
    expect(result.status).toBe('ok');
    const investment = result.data[0];
    expect(investment.provider).toBe('alphavantage');
    expect(investment.perf6mPercent).toBe(12.5);

    const failingClient = createSupabaseClient({ data: null, error: new Error('offline') });
    const fallback = await loadInvestments(failingClient);
    const errored = expectErrorState(fallback);
    expect(errored.data).toHaveLength(INVESTMENTS_FALLBACK.length);
    expect(errored.message).toContain('offline');
  });
});
