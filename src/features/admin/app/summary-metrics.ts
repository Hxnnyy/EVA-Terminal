import 'server-only';

import type {
  AdminArticle,
  AdminLink,
  AdminMetric,
  AdminProject,
  AdminReelItem,
  CvMeta,
  SectionState,
} from '@/features/admin/types';
import type { InvestmentRecord } from '@/lib/types/investments';
import type { StorageBucketStatus } from '@/lib/types/storage';

type SummarySections = {
  links: SectionState<AdminLink[]>;
  projects: SectionState<AdminProject[]>;
  articles: SectionState<AdminArticle[]>;
  reel: SectionState<AdminReelItem[]>;
  investments: SectionState<InvestmentRecord[]>;
};

type SummaryInput = {
  sections: SummarySections;
  reelBucketStatus?: StorageBucketStatus;
  cvBucketStatus?: StorageBucketStatus;
  cvMeta: CvMeta;
};

export type SummaryResult = {
  metrics: AdminMetric[];
  lastInvestmentFetch: string | null;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(date);
};

const computeLastInvestmentFetch = (entries: InvestmentRecord[]): string | null =>
  entries.reduce<string | null>((latest, entry) => {
    if (!entry.perfLastFetched) {
      return latest;
    }
    if (!latest) {
      return entry.perfLastFetched;
    }
    return new Date(entry.perfLastFetched) > new Date(latest) ? entry.perfLastFetched : latest;
  }, null);

export function buildSummaryMetrics(input: SummaryInput): SummaryResult {
  const { sections, cvMeta } = input;
  const links = sections.links.data;
  const projects = sections.projects.data;
  const articles = sections.articles.data;
  const reel = sections.reel.data;
  const investments = sections.investments.data;

  const lastInvestmentFetch = computeLastInvestmentFetch(investments);
  const lastRefreshLabel = formatDate(lastInvestmentFetch);
  const cvUpdatedLabel = formatDate(cvMeta?.last_updated ?? null);

  const linksTone: AdminMetric['tone'] = links.length > 0 ? 'success' : 'warning';
  const projectsTone: AdminMetric['tone'] = projects.length > 0 ? 'success' : 'warning';
  const articlesTone: AdminMetric['tone'] = articles.length > 0 ? 'success' : 'warning';
  const reelTone: AdminMetric['tone'] = reel.length > 0 ? 'success' : 'warning';
  const investmentsTone: AdminMetric['tone'] = investments.length > 0 ? 'success' : 'warning';
  const cvTone: AdminMetric['tone'] = cvMeta?.file_name ? 'success' : 'warning';

  const metrics: AdminMetric[] = [
    {
      label: 'Links',
      value: links.length.toString(),
      meta: links.length > 0 ? 'Links Configured' : 'Links Not Configured',
      tone: linksTone,
    },
    {
      label: 'Projects',
      value: projects.length.toString(),
      meta: projects.length > 0 ? 'Projects Configured' : 'Projects Not Configured',
      tone: projectsTone,
    },
    {
      label: 'Articles',
      value: articles.length.toString(),
      meta: articles.length > 0 ? 'Articles Configured' : 'Articles Not Configured',
      tone: articlesTone,
    },
    {
      label: 'Reels',
      value: reel.length.toString(),
      meta: reel.length > 0 ? 'Reels Configured' : 'Reels Not Configured',
      tone: reelTone,
    },
    {
      label: 'Investments',
      value: investments.length.toString(),
      meta:
        investments.length > 0
          ? lastRefreshLabel
            ? `Investments Configured - Refreshed ${lastRefreshLabel}`
            : 'Investments Configured'
          : 'Investments Not Configured',
      tone: investmentsTone,
    },
    {
      label: 'CV',
      value: cvMeta?.file_name ? 'Ready' : 'Missing',
      meta: cvMeta?.file_name
        ? cvUpdatedLabel
          ? `CV Configured - Refreshed ${cvUpdatedLabel}`
          : 'CV Configured'
        : 'CV Not Configured',
      tone: cvTone,
    },
  ];

  return {
    metrics,
    lastInvestmentFetch,
  };
}
