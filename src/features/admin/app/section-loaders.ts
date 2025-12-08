import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  loadArticles,
  loadLinks,
  loadProjects,
  loadReel,
} from '@/features/admin/server/data/collections';
import {
  loadBio,
  loadContact,
  loadCurrently,
  loadOnepager,
} from '@/features/admin/server/data/content';
import { loadInvestments } from '@/features/admin/server/data/investments';
import type {
  AdminArticle,
  AdminContactRecord,
  AdminDashboardData,
  AdminLink,
  AdminOnepagerRecord,
  AdminProject,
  AdminReelItem,
  SectionState,
} from '@/features/admin/types';
import { parseBioSingletonRow } from '@/features/terminal/lib/commands/bio.server';
import type { BioSnapshot } from '@/features/terminal/lib/commands/bio.types';
import type { CurrentlySnapshot } from '@/features/terminal/lib/commands/currently.server';
import { BIO_FALLBACK_BODY } from '@/lib/fallbacks/bio';
import { CONTACT_FALLBACK } from '@/lib/fallbacks/contact';
import { CURRENTLY_FALLBACK_BODY, CURRENTLY_FALLBACK_SECTIONS } from '@/lib/fallbacks/currently';
import { INVESTMENTS_FALLBACK } from '@/lib/fallbacks/investments';
import { LINKS_FALLBACK } from '@/lib/fallbacks/links';
import { ONEPAGER_FALLBACK } from '@/lib/fallbacks/onepager';
import { PROJECTS_FALLBACK } from '@/lib/fallbacks/projects';
import { REEL_FALLBACK } from '@/lib/fallbacks/reel';
import { WRITING_FALLBACK } from '@/lib/fallbacks/writing';
import { createLogger, type Logger } from '@/lib/logger';
import type { Database } from '@/lib/supabase/database.types';
import type { InvestmentRecord } from '@/lib/types/investments';

type SectionKey = keyof AdminDashboardData['sections'];

const SECTION_LABELS: Record<SectionKey, string> = {
  bio: 'Bio',
  currently: 'Currently',
  contact: 'Contact',
  links: 'Links',
  projects: 'Projects',
  articles: 'Articles',
  investments: 'Investments',
  reel: 'Reel',
  onepager: 'One-Pager',
};

const getForcedSectionFailure = () =>
  process.env.ADMIN_FORCE_SECTION_FAILURE?.toLowerCase() ?? null;

export type SectionLoadResult<T> = { data: T; ok: boolean; errorMessage?: string };

type SectionLoaders = {
  bio: () => Promise<SectionLoadResult<BioSnapshot>>;
  currently: () => Promise<SectionLoadResult<CurrentlySnapshot>>;
  contact: () => Promise<SectionLoadResult<AdminContactRecord>>;
  links: () => Promise<SectionLoadResult<AdminLink[]>>;
  projects: () => Promise<SectionLoadResult<AdminProject[]>>;
  articles: () => Promise<SectionLoadResult<AdminArticle[]>>;
  investments: () => Promise<SectionLoadResult<InvestmentRecord[]>>;
  reel: () => Promise<SectionLoadResult<AdminReelItem[]>>;
  onepager: () => Promise<SectionLoadResult<AdminOnepagerRecord>>;
};

const buildBioFallback = (): BioSnapshot =>
  parseBioSingletonRow({ body_mdx: BIO_FALLBACK_BODY, updated_at: null });

const buildCurrentlyFallback = (): CurrentlySnapshot => ({
  sections: CURRENTLY_FALLBACK_SECTIONS,
  warnings: ['Currently data unavailable. Using fallback copy.'],
  updatedAt: null,
  rawBody: CURRENTLY_FALLBACK_BODY,
});

const buildContactFallback = (): AdminContactRecord => ({ ...CONTACT_FALLBACK });

const buildLinksFallback = (): AdminLink[] =>
  LINKS_FALLBACK.map(
    (link) =>
      ({
        ...link,
        category: (link.category ?? 'other') as AdminLink['category'],
        order: link.order ?? 0,
      }) satisfies AdminLink,
  );

const buildProjectsFallback = (): AdminProject[] =>
  PROJECTS_FALLBACK.map((project, index) => {
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

const buildArticlesFallback = (): AdminArticle[] =>
  WRITING_FALLBACK.map((entry, index) => ({
    id: `fallback-article-${index}`,
    slug: entry.slug,
    title: entry.title,
    subtitle: entry.subtitle ?? null,
    status: 'published',
    updatedAt: entry.published_at,
    bodyMdx: entry.body_mdx,
  }));

const buildInvestmentsFallback = () => INVESTMENTS_FALLBACK.map((record) => ({ ...record }));

const buildReelFallback = (): AdminReelItem[] =>
  REEL_FALLBACK.map((item, index) => ({
    id: `fallback-reel-${index}`,
    url: item.url,
    caption: item.caption ?? null,
    order: index + 1,
  }));

const buildOnepagerFallback = (): AdminOnepagerRecord => ({
  rawBody: ONEPAGER_FALLBACK.bodyMdx,
  meta: ONEPAGER_FALLBACK.meta,
});

const resolveSection = async <T>(
  loader: () => Promise<SectionState<T>>,
  fallback: () => T,
  label: string,
  logger: Logger,
  key?: SectionKey,
): Promise<SectionLoadResult<T>> => {
  const forcedSection = getForcedSectionFailure();
  try {
    if (forcedSection && key && forcedSection === key.toLowerCase()) {
      throw new Error(`${label} section forced to fail via ADMIN_FORCE_SECTION_FAILURE`);
    }

    const result = await loader();
    if (result.status === 'ok') {
      return { ok: true, data: result.data };
    }
    return {
      ok: false,
      data: result.data,
      errorMessage: result.message ?? `${label} fell back to cached data.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `${label} section unavailable due to unknown error.`;
    logger.warn(`Failed to load ${label} section`, error);
    return { ok: false, data: fallback(), errorMessage: message };
  }
};

export const buildSectionLoaders = (
  supabase: SupabaseClient<Database>,
  logger: Logger = createLogger({ scope: 'admin:sections' }),
): SectionLoaders => ({
  bio: () => resolveSection(loadBio, buildBioFallback, SECTION_LABELS.bio, logger, 'bio'),
  currently: () =>
    resolveSection(
      loadCurrently,
      buildCurrentlyFallback,
      SECTION_LABELS.currently,
      logger,
      'currently',
    ),
  contact: () =>
    resolveSection(loadContact, buildContactFallback, SECTION_LABELS.contact, logger, 'contact'),
  links: () =>
    resolveSection(
      () => loadLinks(supabase),
      buildLinksFallback,
      SECTION_LABELS.links,
      logger,
      'links',
    ),
  projects: () =>
    resolveSection(
      () => loadProjects(supabase),
      buildProjectsFallback,
      SECTION_LABELS.projects,
      logger,
      'projects',
    ),
  articles: () =>
    resolveSection(
      () => loadArticles(supabase),
      buildArticlesFallback,
      SECTION_LABELS.articles,
      logger,
      'articles',
    ),
  investments: () =>
    resolveSection(
      () => loadInvestments(supabase),
      buildInvestmentsFallback,
      SECTION_LABELS.investments,
      logger,
      'investments',
    ),
  reel: () =>
    resolveSection(
      () => loadReel(supabase),
      buildReelFallback,
      SECTION_LABELS.reel,
      logger,
      'reel',
    ),
  onepager: () =>
    resolveSection(
      loadOnepager,
      buildOnepagerFallback,
      SECTION_LABELS.onepager,
      logger,
      'onepager',
    ),
});

const toSectionState = <T>(result: SectionLoadResult<T>, label: string): SectionState<T> => {
  if (result.ok) {
    return { status: 'ok', data: result.data };
  }
  return {
    status: 'error',
    data: result.data,
    message: result.errorMessage ?? `${label} panel is using fallback data.`,
  };
};

const toWarning = (key: SectionKey, result: SectionLoadResult<unknown>): string | null => {
  if (result.ok) return null;
  const label = SECTION_LABELS[key];
  const reason = result.errorMessage ?? 'Section fell back to cached data.';
  return `${label} panel is using fallback data: ${reason}`;
};

export type AdminSectionsResult = {
  ok: boolean;
  sections: AdminDashboardData['sections'];
  warnings: string[];
  failedSections: SectionKey[];
};

export async function loadSections(
  supabase: SupabaseClient<Database>,
  logger: Logger = createLogger({ scope: 'admin:sections' }),
): Promise<AdminSectionsResult> {
  const loaders = buildSectionLoaders(supabase, logger);

  const [bio, currently, contact, links, projects, articles, investments, reel, onepager] =
    await Promise.all([
      loaders.bio(),
      loaders.currently(),
      loaders.contact(),
      loaders.links(),
      loaders.projects(),
      loaders.articles(),
      loaders.investments(),
      loaders.reel(),
      loaders.onepager(),
    ]);

  const results: Record<SectionKey, SectionLoadResult<unknown>> = {
    bio,
    currently,
    contact,
    links,
    projects,
    articles,
    investments,
    reel,
    onepager,
  };

  const sections: AdminDashboardData['sections'] = {
    bio: toSectionState(bio, SECTION_LABELS.bio),
    currently: toSectionState(currently, SECTION_LABELS.currently),
    contact: toSectionState(contact, SECTION_LABELS.contact),
    links: toSectionState(links, SECTION_LABELS.links),
    projects: toSectionState(projects, SECTION_LABELS.projects),
    articles: toSectionState(articles, SECTION_LABELS.articles),
    investments: toSectionState(investments, SECTION_LABELS.investments),
    reel: toSectionState(reel, SECTION_LABELS.reel),
    onepager: toSectionState(onepager, SECTION_LABELS.onepager),
  };

  const warnings: string[] = [];
  const failedSections: SectionKey[] = [];

  (Object.entries(results) as Array<[SectionKey, SectionLoadResult<unknown>]>).forEach(
    ([key, result]) => {
      const warning = toWarning(key, result);
      if (warning) {
        failedSections.push(key);
        warnings.push(warning);
      }
    },
  );

  return {
    ok: failedSections.length === 0,
    sections,
    warnings,
    failedSections,
  };
}
