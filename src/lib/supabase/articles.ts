import 'server-only';

import { unstable_cache } from 'next/cache';

import { type ParsedWritingMdx, parseWritingMdx } from '@/lib/content/writing';
import { serverEnv } from '@/lib/env.server';
import { WRITING_FALLBACK } from '@/lib/fallbacks/writing';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/lib/supabase/database.types';
import {
  createSupabaseServerClient,
  getSupabaseReadonlyClient,
  SupabaseEnvError,
} from '@/lib/supabase/server-client';
import type { Article } from '@/types/models';

type ArticleRow = Database['public']['Tables']['articles']['Row'];

export type ArticleSummary = Omit<Article, 'bodyMdx'>;

export type ArticleDetail = Article & {
  bodyMdx: string;
};

export type ArticleAdminRecord = ArticleSummary & {
  status: 'draft' | 'published';
  updatedAt: string | null;
  bodyMdx: string;
};

const PUBLISHED_STATUSES = ['published'] as const;
const ARTICLE_FETCH_LIMIT = 100;

const fetchArticleSummariesInternal = async (): Promise<ArticleSummary[]> => {
  const logger = createLogger({ scope: 'supabase:articles' });
  if (serverEnv.SUPABASE_DISABLED_FOR_TESTS) {
    return mapFallbackSummaries();
  }
  try {
    const supabase = await getArticlesReadonlyClient();
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, subtitle, body_mdx, status, created_at, updated_at')
      .in('status', PUBLISHED_STATUSES)
      .order('created_at', { ascending: false })
      .limit(ARTICLE_FETCH_LIMIT);

    if (error) {
      throw new Error(`Failed to load articles: ${error.message}`);
    }

    return (data ?? []).map((row) => mapArticleSummary(row));
  } catch (error) {
    if (isSafeToFallback(error)) {
      logger.warn('Article summaries fallback engaged', error);
      return mapFallbackSummaries();
    }
    throw error;
  }
};

export const fetchArticleSummaries = unstable_cache(
  fetchArticleSummariesInternal,
  ['articles:summaries:v2'],
  {
    revalidate: 300,
    tags: ['articles', 'writing'],
  },
);

const fetchArticleBySlugInternal = async (slug: string): Promise<ArticleDetail | null> => {
  const logger = createLogger({ scope: 'supabase:articles' });
  if (serverEnv.SUPABASE_DISABLED_FOR_TESTS) {
    const entry = WRITING_FALLBACK.find((article) => article.slug === slug);
    return entry ? mapFallbackDetail(entry) : null;
  }
  try {
    const supabase = await getArticlesReadonlyClient();
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, subtitle, body_mdx, status, created_at, updated_at')
      .eq('slug', slug)
      .in('status', PUBLISHED_STATUSES)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load article ${slug}: ${error.message}`);
    }

    if (data) {
      return mapArticleDetail(data);
    }
  } catch (error) {
    if (!isSafeToFallback(error)) {
      throw error;
    }
    logger.warn(`Article detail fallback engaged for ${slug}`, error);
  }

  const fallback = WRITING_FALLBACK.find((entry) => entry.slug === slug);
  return fallback ? mapFallbackDetail(fallback) : null;
};

export const fetchArticleBySlug = unstable_cache(
  fetchArticleBySlugInternal,
  ['articles:detail:v2'],
  {
    revalidate: 300,
    tags: ['articles', 'writing'],
  },
);

function mapArticleSummary(
  row: ArticleRow,
  overrides?: Partial<Pick<ArticleSummary, 'title' | 'subtitle' | 'publishedAt'>>,
): ArticleSummary {
  const publishedAt = normalizeTimestamp(row.updated_at ?? row.created_at);
  return {
    id: row.id,
    slug: row.slug,
    title: overrides?.title ?? row.title,
    subtitle: overrides?.subtitle ?? row.subtitle,
    publishedAt: overrides?.publishedAt ?? publishedAt,
  };
}

function mapArticleDetail(row: ArticleRow): ArticleDetail {
  const parsed = parseWritingMdx(row.body_mdx, {
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    publishedAt: normalizeTimestamp(row.updated_at ?? row.created_at),
  });

  return {
    ...mapArticleSummary(row, {
      title: parsed.meta.title,
      subtitle: parsed.meta.subtitle ?? null,
      publishedAt: parsed.meta.publishedAt ?? normalizeTimestamp(row.updated_at ?? row.created_at),
    }),
    bodyMdx: parsed.body,
  };
}

export async function fetchArticlesAdmin(): Promise<ArticleAdminRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, title, subtitle, body_mdx, status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(ARTICLE_FETCH_LIMIT);

  if (error) {
    throw new Error(`Failed to load articles: ${error.message}`);
  }

  return (data ?? []).map((row: ArticleRow) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    publishedAt: row.updated_at ?? row.created_at,
    status: (row.status as 'draft' | 'published') ?? 'draft',
    updatedAt: row.updated_at ?? null,
    bodyMdx: row.body_mdx,
  }));
}

async function getArticlesReadonlyClient() {
  return getSupabaseReadonlyClient();
}

function mapFallbackSummaries(): ArticleSummary[] {
  return WRITING_FALLBACK.map((entry) => mapFallbackSummary(entry));
}

function mapFallbackSummary(
  entry: (typeof WRITING_FALLBACK)[number],
  parsed?: ParsedWritingMdx,
): ArticleSummary {
  const meta = parsed?.meta
    ? parsed.meta
    : parseWritingMdx(entry.body_mdx, {
        title: entry.title,
        subtitle: entry.subtitle ?? undefined,
        publishedAt: entry.published_at ?? null,
      }).meta;

  return {
    id: `fallback-${entry.slug}`,
    slug: entry.slug,
    title: meta.title,
    subtitle: meta.subtitle ?? null,
    publishedAt: meta.publishedAt ?? entry.published_at,
  };
}

function mapFallbackDetail(entry: (typeof WRITING_FALLBACK)[number]): ArticleDetail {
  const parsed = parseWritingMdx(entry.body_mdx, {
    title: entry.title,
    subtitle: entry.subtitle ?? undefined,
    publishedAt: entry.published_at ?? null,
  });

  return {
    ...mapFallbackSummary(entry, parsed),
    title: parsed.meta.title,
    subtitle: parsed.meta.subtitle ?? null,
    publishedAt: parsed.meta.publishedAt ?? entry.published_at,
    bodyMdx: parsed.body,
  };
}

function isSafeToFallback(error: unknown): boolean {
  return error instanceof SupabaseEnvError;
}

function normalizeTimestamp(input: string | null): string | null {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}
