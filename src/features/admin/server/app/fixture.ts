import 'server-only';

import { buildSummaryMetrics } from '@/features/admin/app/summary-metrics';
import { parseBioSingletonRow } from '@/features/terminal/lib/commands/bio.server';
import type { CurrentlySnapshot } from '@/features/terminal/lib/commands/currently.server';
import { serverEnv } from '@/lib/env.server';
import { BIO_FALLBACK_BODY } from '@/lib/fallbacks/bio';
import { CONTACT_FALLBACK } from '@/lib/fallbacks/contact';
import { CURRENTLY_FALLBACK_BODY, CURRENTLY_FALLBACK_SECTIONS } from '@/lib/fallbacks/currently';
import { CV_FALLBACK_METADATA } from '@/lib/fallbacks/cv';
import { INVESTMENTS_FALLBACK } from '@/lib/fallbacks/investments';
import { LINKS_FALLBACK } from '@/lib/fallbacks/links';
import { ONEPAGER_FALLBACK } from '@/lib/fallbacks/onepager';
import { PROJECTS_FALLBACK } from '@/lib/fallbacks/projects';
import { REEL_FALLBACK } from '@/lib/fallbacks/reel';
import { WRITING_FALLBACK } from '@/lib/fallbacks/writing';
import type { StorageBucketStatus } from '@/lib/types/storage';

import type {
  AdminArticle,
  AdminDashboardData,
  AdminLink,
  AdminProject,
  AdminReelItem,
  CvMeta,
} from '../../types';

export function buildAdminFixtureData(userEmail: string): AdminDashboardData {
  const articles: AdminArticle[] = WRITING_FALLBACK.map((entry, index) => ({
    id: `fallback-article-${index}`,
    slug: entry.slug,
    title: entry.title,
    subtitle: entry.subtitle ?? null,
    status: 'published',
    updatedAt: entry.published_at,
    bodyMdx: entry.body_mdx,
  }));

  const projects: AdminProject[] = PROJECTS_FALLBACK.map((project, index) => {
    const caseStudy = project.actions.find((action) => action.kind === 'internal');
    const external = project.actions.find((action) => action.kind === 'external');
    const orderValue: number = (project as { order?: number }).order ?? index + 1;
    return {
      id: project.id,
      slug: caseStudy?.href.split('/').pop() ?? null,
      title: project.title,
      blurb: project.blurb ?? null,
      url: external?.href ?? null,
      tags: [...project.tags],
      order: orderValue,
    } satisfies AdminProject;
  });

  const links: AdminLink[] = LINKS_FALLBACK.map(
    (link) =>
      ({
        ...link,
        category: (link.category ?? 'other') as AdminLink['category'],
        order: link.order ?? 0,
      }) satisfies AdminLink,
  );

  const investments = INVESTMENTS_FALLBACK.map((record) => ({ ...record }));

  const reel: AdminReelItem[] = REEL_FALLBACK.map((item, index) => ({
    id: `fallback-reel-${index}`,
    url: item.url,
    caption: item.caption ?? null,
    order: index + 1,
  }));

  const bio = parseBioSingletonRow({ body_mdx: BIO_FALLBACK_BODY, updated_at: null });
  const currently: CurrentlySnapshot = {
    sections: CURRENTLY_FALLBACK_SECTIONS,
    warnings: [],
    updatedAt: null,
    rawBody: CURRENTLY_FALLBACK_BODY,
  };

  const bucketStatuses: StorageBucketStatus[] = [
    {
      name: serverEnv.NEXT_PUBLIC_SUPABASE_REEL_BUCKET,
      ok: true,
      created: true,
      message: 'Fixture bucket ready',
    },
    {
      name: serverEnv.NEXT_PUBLIC_SUPABASE_CV_BUCKET,
      ok: true,
      created: true,
      message: 'Fixture bucket ready',
    },
  ];

  const reelBucketStatus = bucketStatuses[0];
  const cvBucketStatus = bucketStatuses[1];
  const cvMeta: CvMeta = {
    download_url: CV_FALLBACK_METADATA.downloadUrl ?? undefined,
    last_updated: CV_FALLBACK_METADATA.lastUpdated ?? undefined,
    file_name: CV_FALLBACK_METADATA.fileName ?? undefined,
    file_size_bytes: CV_FALLBACK_METADATA.fileSizeBytes ?? undefined,
    checksum: CV_FALLBACK_METADATA.checksum ?? undefined,
  };

  const { metrics: summaryMetrics, lastInvestmentFetch } = buildSummaryMetrics({
    sections: {
      links: { status: 'ok', data: links },
      projects: { status: 'ok', data: projects },
      articles: { status: 'ok', data: articles },
      reel: { status: 'ok', data: reel },
      investments: { status: 'ok', data: investments },
    },
    reelBucketStatus,
    cvBucketStatus,
    cvMeta,
  });

  return {
    userEmail,
    summaryMetrics,
    bucketStatuses,
    reelBucketStatus,
    cvBucketStatus,
    cvMeta,
    lastInvestmentFetch,
    sections: {
      bio: { status: 'ok', data: bio },
      currently: { status: 'ok', data: currently },
      contact: { status: 'ok', data: { ...CONTACT_FALLBACK } },
      links: { status: 'ok', data: links },
      projects: { status: 'ok', data: projects },
      articles: { status: 'ok', data: articles },
      investments: { status: 'ok', data: investments },
      reel: { status: 'ok', data: reel },
      onepager: {
        status: 'ok',
        data: {
          rawBody: ONEPAGER_FALLBACK.bodyMdx,
          meta: ONEPAGER_FALLBACK.meta,
        },
      },
    },
  };
}
