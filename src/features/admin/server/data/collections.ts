import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';

import { LINKS_FALLBACK } from '@/lib/fallbacks/links';
import { PROJECTS_FALLBACK } from '@/lib/fallbacks/projects';
import { REEL_FALLBACK } from '@/lib/fallbacks/reel';
import { WRITING_FALLBACK } from '@/lib/fallbacks/writing';
import type { Database } from '@/lib/supabase/database.types';

import type {
  AdminArticle,
  AdminLink,
  AdminProject,
  AdminReelItem,
  SectionState,
} from '../../types';

const LINKS_FETCH_LIMIT = 200;
const PROJECTS_FETCH_LIMIT = 100;
const ARTICLES_FETCH_LIMIT = 100;
const REEL_FETCH_LIMIT = 200;

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export async function loadLinks(
  supabase: SupabaseClient<Database>,
): Promise<SectionState<AdminLink[]>> {
  noStore();
  try {
    const { data, error } = await supabase
      .from('links')
      .select('id, category, label, url, order, created_at, updated_at')
      .order('order', { ascending: true })
      .limit(LINKS_FETCH_LIMIT);

    if (error) {
      throw error;
    }

    const mapped: AdminLink[] = (data ?? []).map((row) => ({
      id: row.id,
      category: (row.category ?? 'other') as AdminLink['category'],
      label: row.label,
      url: row.url,
      order: row.order ?? 0,
    }));

    return { status: 'ok', data: mapped };
  } catch (error) {
    const fallback = LINKS_FALLBACK.map(
      (link) =>
        ({
          ...link,
          category: (link.category ?? 'other') as AdminLink['category'],
          order: link.order ?? 0,
        }) satisfies AdminLink,
    );
    return {
      status: 'error',
      data: fallback,
      message: toErrorMessage(
        error,
        'Unable to load links. Using fallback list; retry after Supabase recovers.',
      ),
    };
  }
}

export async function loadProjects(
  supabase: SupabaseClient<Database>,
): Promise<SectionState<AdminProject[]>> {
  noStore();
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, slug, title, blurb, url, tags, order')
      .order('order', { ascending: true })
      .limit(PROJECTS_FETCH_LIMIT);

    if (error) {
      throw error;
    }

    const mapped: AdminProject[] = (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug ?? null,
      title: row.title,
      blurb: row.blurb ?? null,
      url: row.url ?? null,
      tags: Array.isArray(row.tags)
        ? row.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      order: row.order ?? 0,
    }));

    return { status: 'ok', data: mapped };
  } catch (error) {
    const fallback: AdminProject[] = PROJECTS_FALLBACK.map((project, index) => {
      const internal = project.actions.find((action) => action.kind === 'internal');
      const external = project.actions.find((action) => action.kind === 'external');
      const orderValue: number = (project as { order?: number }).order ?? index + 1;
      return {
        id: project.id,
        slug: internal?.href.split('/').pop() ?? null,
        title: project.title,
        blurb: project.blurb ?? null,
        url: external?.href ?? null,
        tags: [...project.tags],
        order: orderValue,
      } satisfies AdminProject;
    });
    return {
      status: 'error',
      data: fallback,
      message: toErrorMessage(
        error,
        'Unable to load projects. Using fallback set; retry after Supabase is reachable.',
      ),
    };
  }
}

export async function loadArticles(
  supabase: SupabaseClient<Database>,
): Promise<SectionState<AdminArticle[]>> {
  noStore();
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, subtitle, body_mdx, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(ARTICLES_FETCH_LIMIT);

    if (error) {
      throw error;
    }

    const mapped: AdminArticle[] = (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle ?? null,
      status: (row.status as 'draft' | 'published') ?? 'draft',
      updatedAt: row.updated_at ?? row.created_at ?? null,
      bodyMdx: row.body_mdx,
    }));

    return { status: 'ok', data: mapped };
  } catch (error) {
    const fallback: AdminArticle[] = WRITING_FALLBACK.map((entry, index) => ({
      id: `fallback-article-${index}`,
      slug: entry.slug,
      title: entry.title,
      subtitle: entry.subtitle ?? null,
      status: 'published',
      updatedAt: entry.published_at,
      bodyMdx: entry.body_mdx,
    }));
    return {
      status: 'error',
      data: fallback,
      message: toErrorMessage(
        error,
        'Unable to load articles. Using fallback copy; retry after Supabase is reachable.',
      ),
    };
  }
}

export async function loadReel(
  supabase: SupabaseClient<Database>,
): Promise<SectionState<AdminReelItem[]>> {
  noStore();
  try {
    const { data, error } = await supabase
      .from('reel_images')
      .select('id, url, caption, order, created_at, updated_at')
      .order('order', { ascending: true })
      .limit(REEL_FETCH_LIMIT);

    if (error) {
      throw error;
    }

    const mapped: AdminReelItem[] = (data ?? []).map((row) => ({
      id: row.id,
      url: row.url,
      caption: row.caption ?? null,
      order: row.order ?? 0,
    }));

    return { status: 'ok', data: mapped };
  } catch (error) {
    const fallback: AdminReelItem[] = REEL_FALLBACK.map((item, index) => ({
      id: `fallback-reel-${index}`,
      url: item.url,
      caption: item.caption ?? null,
      order: index + 1,
    }));
    return {
      status: 'error',
      data: fallback,
      message: toErrorMessage(
        error,
        'Unable to load reel items. Using fallback gallery; retry after restoring storage access.',
      ),
    };
  }
}
