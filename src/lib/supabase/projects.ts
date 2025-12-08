import 'server-only';

import { unstable_cache } from 'next/cache';

import { serverEnv } from '@/lib/env.server';
import { PROJECTS_FALLBACK } from '@/lib/fallbacks/projects';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/lib/supabase/database.types';
import {
  createSupabaseServerClient,
  getSupabaseReadonlyClient,
  SupabaseEnvError,
} from '@/lib/supabase/server-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role-client';
import type { Project, ProjectActionLink as ProjectActionLinkModel } from '@/types/models';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

export type ProjectActionLink = ProjectActionLinkModel;

export type ProjectSummary = Project;

export type ProjectsPayload = {
  projects: ProjectSummary[];
};

export type ProjectAdminRecord = {
  id: string;
  slug: string | null;
  title: string;
  blurb: string | null;
  url: string | null;
  tags: string[];
  order: number;
};

const PROJECT_MDX_BUCKET = serverEnv.NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET;

const CASE_STUDY_FILENAME = 'case-study.mdx';
const PROJECT_FETCH_LIMIT = 100;

async function projectHasCaseStudy(projectId: string): Promise<boolean> {
  try {
    const storageClient = getSupabaseServiceRoleClient();
    const { data, error } = await storageClient.storage
      .from(PROJECT_MDX_BUCKET)
      .list(projectId, { limit: 5 });
    if (error || !data) {
      return false;
    }
    return data.some((file) => file.name === CASE_STUDY_FILENAME);
  } catch {
    return false;
  }
}

const fetchProjectsInternal = async (): Promise<ProjectSummary[]> => {
  const logger = createLogger({ scope: 'supabase:projects' });
  if (serverEnv.SUPABASE_DISABLED_FOR_TESTS) {
    return PROJECTS_FALLBACK.map((project) => ({
      id: project.id,
      slug: null,
      title: project.title,
      blurb: project.blurb,
      tags: [...project.tags],
      actions: project.actions.map((action) => ({ ...action })),
    }));
  }
  try {
    const supabase = getSupabaseReadonlyClient();
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, blurb, slug, url, tags, order, created_at, updated_at')
      .order('order', { ascending: true })
      .limit(PROJECT_FETCH_LIMIT);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    const mapped = await Promise.all(
      rows.map(async (project) => {
        const hasCaseStudy = await projectHasCaseStudy(project.id);
        return mapProjectRow(project, hasCaseStudy);
      }),
    );
    return mapped;
  } catch (error) {
    if (error instanceof SupabaseEnvError) {
      logger.warn('Projects fallback engaged', { message: error.message });
    } else {
      logger.warn('Failed to load projects from Supabase. Using fallback.', error);
    }
    return PROJECTS_FALLBACK.map((project) => ({
      id: project.id,
      slug: null,
      title: project.title,
      blurb: project.blurb,
      tags: [...project.tags],
      actions: project.actions.map((action) => ({ ...action })),
    }));
  }
};

export const fetchProjects = unstable_cache(fetchProjectsInternal, ['projects:list:v2'], {
  revalidate: 300,
  tags: ['projects'],
});

function mapProjectRow(row: ProjectRow, hasCaseStudy = false): ProjectSummary {
  const actions: ProjectActionLink[] = [];
  const slug = typeof row.slug === 'string' ? row.slug.trim() : '';
  const url = typeof row.url === 'string' ? row.url.trim() : '';
  const updatedAt = normalizeTimestamp(row.updated_at ?? row.created_at);

  if (slug) {
    actions.push({
      kind: 'internal',
      href: `/projects/${slug}`,
      label: 'Case Study',
    });
  }

  if (url) {
    actions.push({
      kind: 'external',
      href: url,
      label: 'Launch',
    });
  }

  const tags = Array.isArray(row.tags)
    ? row.tags.filter((tag): tag is string => typeof tag === 'string' && !!tag)
    : [];

  return {
    id: row.id,
    slug: slug || null,
    title: row.title,
    blurb: row.blurb,
    tags,
    actions,
    hasCaseStudy,
    updatedAt,
  };
}

function normalizeTimestamp(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export type ProjectCaseStudy = {
  project: ProjectSummary;
  bodyMdx: string;
};

const buildCaseStudyPath = (projectId: string) => `${projectId}/case-study.mdx`;

const fetchProjectCaseStudyBySlugInternal = async (
  slug: string,
): Promise<ProjectCaseStudy | null> => {
  const supabase = getSupabaseReadonlyClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, blurb, slug, url, tags, order')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const hasCaseStudy = await projectHasCaseStudy(data.id);
  const summary = mapProjectRow(data as ProjectRow, hasCaseStudy);
  const path = buildCaseStudyPath(data.id);

  const { data: file, error: downloadError } = await supabase.storage
    .from(PROJECT_MDX_BUCKET)
    .download(path);

  if (downloadError || !file) {
    return null;
  }

  const bodyMdx = await file.text();

  return {
    project: summary,
    bodyMdx,
  };
};

export const fetchProjectCaseStudyBySlug = unstable_cache(
  fetchProjectCaseStudyBySlugInternal,
  ['projects:case-study:v2'],
  {
    revalidate: 300,
    tags: ['projects'],
  },
);

export async function fetchProjectsAdmin(): Promise<ProjectAdminRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, title, blurb, url, tags, order')
    .order('order', { ascending: true })
    .limit(PROJECT_FETCH_LIMIT);

  if (error) {
    throw new Error(`Failed to load projects: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
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
}
