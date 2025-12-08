import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { resolveAdminAuth } from '@/features/admin/app/admin-auth';
import { resolveBucketStatus } from '@/features/admin/app/bucket-status';
import { loadCvMeta } from '@/features/admin/app/cv-meta';
import { loadSections } from '@/features/admin/app/section-loaders';
import { buildSummaryMetrics } from '@/features/admin/app/summary-metrics';
import { AdminAuthGate } from '@/features/admin/components/admin-auth-gate';
import { AdminDashboard } from '@/features/admin/components/admin-dashboard';
import { buildAdminFixtureData } from '@/features/admin/server/app/fixture';
import type { AdminDashboardData } from '@/features/admin/types';
import { createLogger, type Logger } from '@/lib/logger';
import type { Database } from '@/lib/supabase/database.types';

const forceFallbackWarning = 'Admin data forced into fallback for testing.';

const forceIntoFallback = (data: AdminDashboardData): AdminDashboardData => {
  const sections = Object.fromEntries(
    Object.entries(data.sections).map(([key, section]) => [
      key,
      {
        status: 'error',
        data: section.data,
        message: forceFallbackWarning,
      },
    ]),
  ) as AdminDashboardData['sections'];

  return {
    ...data,
    sections,
    warnings: [forceFallbackWarning],
    degraded: true,
  };
};

export default async function AdminPage() {
  noStore();

  const headerList = await headers();
  const requestId =
    headerList.get('x-request-id') ??
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `req-${Date.now()}`);
  const forceFallback =
    headerList.get('x-force-admin-fallback') === '1' ||
    process.env.ADMIN_E2E_FORCE_DEGRADED === 'true';
  const logger = createLogger({ requestId, scope: 'admin:page' });

  const auth = await resolveAdminAuth(logger);

  if (auth.status === 'forbidden') {
    const params = new URLSearchParams({
      reason: 'admin',
      message: auth.message,
    });
    redirect(`/forbidden?${params.toString()}`);
  }

  if (auth.status === 'env-error') {
    return (
      <AdminAuthGate
        autoOpen={false}
        message={
          auth.message ??
          'Supabase admin credentials are not configured. Update your environment variables to continue.'
        }
      />
    );
  }

  if (auth.status === 'unauthenticated') {
    return <AdminAuthGate message={auth.message} />;
  }

  const session = auth.session;
  const correlationId = requestId || logger.requestId;

  if (session.kind === 'fixture') {
    const fixture = buildAdminFixtureData(session.userEmail);
    const forcedFixture = forceFallback ? forceIntoFallback(fixture) : fixture;
    return (
      <AdminDashboard
        {...forcedFixture}
        correlationId={correlationId}
        degraded={forceFallback ?? false}
      />
    );
  }

  const data = await loadDashboardData({
    supabase: session.supabase,
    userEmail: session.userEmail,
    forceFallback,
    logger,
    correlationId,
  });

  return <AdminDashboard {...data} />;
}

type LoadDashboardParams = {
  supabase: SupabaseClient<Database>;
  userEmail: string;
  forceFallback: boolean;
  logger: Logger;
  correlationId?: string;
};

async function loadDashboardData(params: LoadDashboardParams): Promise<AdminDashboardData> {
  try {
    const sectionsResult = await loadSections(params.supabase, params.logger);
    const [bucketResult, cvMetaResult] = await Promise.all([
      resolveBucketStatus(params.logger),
      loadCvMeta(params.supabase, params.logger),
    ]);

    const { metrics: summaryMetrics, lastInvestmentFetch } = buildSummaryMetrics({
      sections: {
        links: sectionsResult.sections.links,
        projects: sectionsResult.sections.projects,
        articles: sectionsResult.sections.articles,
        reel: sectionsResult.sections.reel,
        investments: sectionsResult.sections.investments,
      },
      reelBucketStatus: bucketResult.reelBucketStatus,
      cvBucketStatus: bucketResult.cvBucketStatus,
      cvMeta: cvMetaResult.data,
    });

    const warnings = [
      ...sectionsResult.warnings,
      ...bucketResult.warnings,
      ...(cvMetaResult.ok ? [] : [cvMetaResult.errorMessage]),
    ];

    const degraded = !sectionsResult.ok || !bucketResult.ok || !cvMetaResult.ok;

    let data: AdminDashboardData = {
      userEmail: params.userEmail,
      summaryMetrics,
      bucketStatuses: bucketResult.bucketStatuses,
      reelBucketStatus: bucketResult.reelBucketStatus,
      cvBucketStatus: bucketResult.cvBucketStatus,
      projectBucketStatus: bucketResult.projectBucketStatus,
      cvMeta: cvMetaResult.data,
      lastInvestmentFetch,
      sections: sectionsResult.sections,
      warnings: warnings.length ? warnings : undefined,
      correlationId: params.correlationId,
      degraded,
    };

    if (params.forceFallback) {
      data = forceIntoFallback(data);
    }

    return data;
  } catch (error) {
    params.logger.error('Admin dashboard load failed; serving fallback data', error);
    const fallback = buildAdminFixtureData(params.userEmail);
    const warnings = [
      'Live Supabase admin data is unavailable. Showing fallback content; retry after verifying credentials and network.',
      error instanceof Error ? error.message : 'Unknown admin loader error.',
    ];

    return {
      ...fallback,
      warnings,
      degraded: true,
      correlationId: params.correlationId,
    };
  }
}
