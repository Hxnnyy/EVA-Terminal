import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath, revalidateTag } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as adminRefreshPost } from '@/app/api/admin/investments/refresh/route';
import { POST as publicRefreshPost } from '@/app/api/investments/refresh/route';
import { GET as investmentsGet } from '@/app/api/investments/route';
import * as adminAuth from '@/lib/auth/admin';
import { runBootWarmups } from '@/lib/boot/warmup';
import * as refreshModule from '@/lib/investments/refresh';
import type { Database } from '@/lib/supabase/database.types';
import * as supabaseInvestments from '@/lib/supabase/investments';
import * as serverClient from '@/lib/supabase/server-client';

vi.mock('next/cache', () => {
  const revalidatePath = vi.fn();
  const revalidateTag = vi.fn();
  const unstable_cache = <T extends (...args: unknown[]) => unknown>(fn: T) => fn;
  const unstable_noStore = vi.fn();
  return {
    revalidatePath,
    revalidateTag,
    unstable_cache,
    unstable_noStore,
  };
});

describe('investments GET', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads cached investments without invoking refresh helpers', async () => {
    const fetchSpy = vi.spyOn(supabaseInvestments, 'fetchInvestments').mockResolvedValue([
      {
        id: '1',
        ticker: 'AAPL',
        label: 'Apple',
        order: 1,
        provider: 'stooq',
        providerSymbol: 'aapl.us',
        perf6mPercent: 12.34,
        perfLastFetched: '2025-12-01T00:00:00.000Z',
      },
    ]);
    const refreshSpy = vi.spyOn(refreshModule, 'maybeRefreshInvestments');

    const response = await investmentsGet(new Request('http://localhost/api/investments'));
    const payload = (await response.json()) as { investments: Array<{ ticker: string }> };

    expect(fetchSpy).toHaveBeenCalledWith();
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(payload.investments[0].ticker).toBe('AAPL');
    expect(response.headers.get('Cache-Control')).toContain('max-age=600');
  });
});

describe('maybeRefreshInvestments guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('skips refresh when last run is within the guard window', async () => {
    const refreshSpy = vi.fn().mockResolvedValue({ results: [] });
    const result = await refreshModule.maybeRefreshInvestments({
      minIntervalMs: 24 * 60 * 60 * 1000,
      now: new Date('2025-12-04T12:00:00.000Z'),
      supabase: {} as unknown as SupabaseClient<Database>,
      getLastRefreshFn: vi
        .fn()
        .mockResolvedValue(
          new Date('2025-12-04T09:00:00.000Z'),
        ) as typeof refreshModule.getLastInvestmentRefresh,
      refreshFn: refreshSpy as typeof refreshModule.refreshInvestmentsPerformance,
    });

    expect(result.status).toBe('skipped');
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('runs refresh when outside the guard window', async () => {
    const refreshSpy = vi
      .fn()
      .mockResolvedValue({ results: [{ ticker: 'AAPL', updated: true, source: 'stooq' }] });

    const now = new Date('2025-12-04T12:00:00.000Z');
    const result = await refreshModule.maybeRefreshInvestments({
      minIntervalMs: 24 * 60 * 60 * 1000,
      now,
      supabase: {} as unknown as SupabaseClient<Database>,
      getLastRefreshFn: vi
        .fn()
        .mockResolvedValue(
          new Date('2025-12-02T00:00:00.000Z'),
        ) as typeof refreshModule.getLastInvestmentRefresh,
      refreshFn: refreshSpy as typeof refreshModule.refreshInvestmentsPerformance,
    });

    expect(result.status).toBe('refreshed');
    expect(result.lastRefreshed).toBe(now.toISOString());
    expect(refreshSpy).toHaveBeenCalledOnce();
  });
});

describe('admin refresh endpoint', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('forces a refresh and returns fresh investments', async () => {
    vi.spyOn(serverClient, 'createSupabaseServerClient').mockResolvedValue(
      {} as unknown as SupabaseClient<Database>,
    );
    vi.spyOn(adminAuth, 'requireAdminUser').mockResolvedValue({
      ok: true,
      user: {} as never,
    });
    vi.spyOn(refreshModule, 'maybeRefreshInvestments').mockResolvedValue({
      status: 'refreshed',
      lastRefreshed: '2025-12-04T12:00:00.000Z',
      results: [{ ticker: 'AAPL', updated: true, source: 'stooq' }],
    });
    vi.spyOn(supabaseInvestments, 'fetchInvestments').mockResolvedValue([
      {
        id: '1',
        ticker: 'AAPL',
        label: 'Apple',
        order: 1,
        provider: 'stooq',
        providerSymbol: 'aapl.us',
        perf6mPercent: 12.34,
        perfLastFetched: '2025-12-01T00:00:00.000Z',
      },
    ]);

    const response = await adminRefreshPost(
      new Request('http://localhost/api/admin/investments/refresh', { method: 'POST' }),
    );
    const json = (await response.json()) as {
      investments: Array<{ ticker: string }>;
      status: string;
      lastRefreshed: string | null;
    };

    expect(response.status).toBe(200);
    expect(json.investments).toHaveLength(1);
    expect(json.status).toBe('refreshed');
    expect(json.lastRefreshed).toBe('2025-12-04T12:00:00.000Z');
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith('investments', 'max');
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/api/investments');
    expect(refreshModule.maybeRefreshInvestments).toHaveBeenCalledWith({ force: true });
    expect(supabaseInvestments.fetchInvestments).toHaveBeenCalledWith({ skipCache: true });
  });

  it('rejects non-admin callers', async () => {
    vi.spyOn(serverClient, 'createSupabaseServerClient').mockResolvedValue(
      {} as unknown as SupabaseClient<Database>,
    );
    vi.spyOn(adminAuth, 'requireAdminUser').mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Please sign in.',
    });
    const refreshSpy = vi.spyOn(refreshModule, 'maybeRefreshInvestments');

    const response = await adminRefreshPost(
      new Request('http://localhost/api/admin/investments/refresh', { method: 'POST' }),
    );

    expect(response.status).toBe(401);
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});

describe('public refresh endpoint (stubbed)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('returns 410 and performs no writes', async () => {
    const refreshSpy = vi.spyOn(refreshModule, 'maybeRefreshInvestments');
    const response = await publicRefreshPost(
      new Request('http://localhost/api/investments/refresh', { method: 'POST' }),
    );

    expect(response.status).toBe(410);
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(vi.mocked(revalidateTag)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });
});

describe('boot warmup', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    globalThis.fetch = originalFetch;
  });

  it('warms the cached GET endpoint without triggering refresh writes', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_input: RequestInfo | URL) => {
      void _input;
      return new Response('{}', { status: 200 });
    });
    globalThis.fetch = fetchMock;

    await runBootWarmups();
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/investments/refresh');
    const readCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/investments');
    expect(refreshCalls.length).toBe(0);
    expect(readCalls.length).toBe(1);

    fetchMock.mockClear();
    await runBootWarmups();
    const secondRunReads = fetchMock.mock.calls.filter(([url]) => url === '/api/investments');
    expect(secondRunReads.length).toBe(0);
  });
});
