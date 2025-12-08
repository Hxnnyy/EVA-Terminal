import type { BioSnapshot } from '@/features/terminal/lib/commands/bio.types';
import type { CurrentlySnapshot } from '@/features/terminal/lib/commands/currently.server';
import type { InvestmentRecord } from '@/lib/types/investments';
import type { StorageBucketStatus } from '@/lib/types/storage';

type MetricTone = 'default' | 'warning' | 'success';

export type AdminMetric = {
  label: string;
  value: string;
  meta?: string;
  tone?: MetricTone;
};

export type SectionState<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; data: T; message: string };

export type CvMeta = {
  download_url?: string;
  last_updated?: string;
  file_name?: string;
  file_size_bytes?: number;
  checksum?: string;
} | null;

export type AdminContactRecord = {
  email: string;
  phone?: string | null;
  discord?: string | null;
};

export type AdminArticle = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status: 'draft' | 'published';
  updatedAt: string | null;
  bodyMdx: string;
};

export type AdminLink = {
  id: string;
  category: 'social' | 'site' | 'other';
  label: string;
  url: string;
  order: number;
};

export type AdminProject = {
  id: string;
  slug: string | null;
  title: string;
  blurb: string | null;
  url: string | null;
  tags: string[];
  order: number;
};

export type AdminReelItem = {
  id: string;
  url: string;
  caption: string | null;
  order: number;
};

export type AdminOnepagerRecord = {
  rawBody: string | null;
  meta: { title?: string; subtitle?: string } | null;
};

type AdminSections = {
  bio: SectionState<BioSnapshot>;
  currently: SectionState<CurrentlySnapshot>;
  contact: SectionState<AdminContactRecord>;
  articles: SectionState<AdminArticle[]>;
  links: SectionState<AdminLink[]>;
  projects: SectionState<AdminProject[]>;
  investments: SectionState<InvestmentRecord[]>;
  reel: SectionState<AdminReelItem[]>;
  onepager: SectionState<AdminOnepagerRecord>;
};

export type AdminDashboardData = {
  userEmail: string;
  summaryMetrics: AdminMetric[];
  bucketStatuses: StorageBucketStatus[];
  reelBucketStatus?: StorageBucketStatus;
  cvBucketStatus?: StorageBucketStatus;
  projectBucketStatus?: StorageBucketStatus;
  cvMeta: CvMeta;
  lastInvestmentFetch: string | null;
  sections: AdminSections;
  warnings?: string[];
  correlationId?: string;
  degraded?: boolean;
};

export type AdminDataResult =
  | { status: 'ok'; data: AdminDashboardData }
  | { status: 'error'; message: string };
