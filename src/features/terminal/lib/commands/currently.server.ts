import { unstable_cache } from 'next/cache';

import { serverEnv } from '@/lib/env.server';
import { CURRENTLY_FALLBACK_BODY } from '@/lib/fallbacks/currently';
import { createLogger } from '@/lib/logger';
import { getSupabaseReadonlyClient, SupabaseEnvError } from '@/lib/supabase/server-client';

type CurrentlySection = {
  title: string;
  items: string[];
};

export type CurrentlySnapshot = {
  sections: CurrentlySection[];
  warnings: string[];
  updatedAt: string | null;
  rawBody: string | null;
};

type SingletonRow = {
  body_mdx: string | null;
  updated_at: string | null;
};

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;
const EMPHASIS_PATTERN = /\*([^*]+)\*/g;
const CODE_PATTERN = /`([^`]+)`/g;

const sanitize = (value: string) =>
  value
    .replace(LINK_PATTERN, (_, label: string, url: string) => {
      const trimmedLabel = label.trim();
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        return trimmedLabel;
      }
      return `${trimmedLabel} -> ${trimmedUrl}`;
    })
    .replace(BOLD_PATTERN, '$1')
    .replace(EMPHASIS_PATTERN, '$1')
    .replace(CODE_PATTERN, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function parseCurrentlySingletonRow(row: SingletonRow | null): CurrentlySnapshot {
  const rawBody = row?.body_mdx ?? null;
  const updatedAt = row?.updated_at ?? null;

  if (!rawBody || !rawBody.trim()) {
    return {
      sections: [],
      warnings: rawBody
        ? ['Currently singleton is present but empty.']
        : ['Currently singleton is missing. Seed content via the admin dashboard.'],
      updatedAt,
      rawBody,
    };
  }

  const sections: CurrentlySection[] = [];
  let current: CurrentlySection | null = null;

  const pushSection = (title: string) => {
    const safeTitle = title.trim() || 'Currently';
    current = { title: safeTitle, items: [] };
    sections.push(current);
  };

  const appendItem = (value: string) => {
    if (!current) {
      pushSection('Currently');
    }
    const sanitized = sanitize(value);
    if (sanitized) {
      current!.items.push(sanitized);
    }
  };

  rawBody.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }
    const headingMatch = line.match(/^#{2,6}\s+(.+)$/);
    if (headingMatch) {
      pushSection(sanitize(headingMatch[1]));
      return;
    }
    if (line.startsWith('- ')) {
      appendItem(line.slice(2));
      return;
    }
    appendItem(line);
  });

  const filteredSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter(Boolean),
    }))
    .filter((section) => section.items.length);

  const warnings: string[] = [];
  if (!filteredSections.length) {
    warnings.push('Currently singleton did not include any parsable entries.');
  }

  return {
    sections: filteredSections,
    warnings,
    updatedAt,
    rawBody,
  };
}

export async function fetchCurrentlySnapshot(): Promise<CurrentlySnapshot> {
  if (serverEnv.SUPABASE_DISABLED_FOR_TESTS) {
    return buildFallbackCurrentlySnapshot('Supabase client disabled for tests.');
  }
  try {
    const client = getSupabaseReadonlyClient();
    const { data: row, error } = await client
      .from('singletons')
      .select('body_mdx, updated_at')
      .eq('key', 'currently')
      .maybeSingle();

    if (error) {
      throw error;
    }

    const snapshot = parseCurrentlySingletonRow(row ?? null);
    if (snapshot.sections.length) {
      return snapshot;
    }

    return buildFallbackCurrentlySnapshot(
      'Currently singleton was empty or unparsable. Showing fallback copy.',
    );
  } catch (error) {
    if (error instanceof SupabaseEnvError) {
      return buildFallbackCurrentlySnapshot(error.message);
    }
    createLogger({ scope: 'terminal:currently' }).warn('Currently fallback engaged', error);
    return buildFallbackCurrentlySnapshot('Supabase request failed. Showing fallback copy.');
  }
}

export const fetchCurrentlySnapshotCached = unstable_cache(
  fetchCurrentlySnapshot,
  ['currently:snapshot'],
  {
    revalidate: 300,
    tags: ['currently', 'singletons'],
  },
);

function buildFallbackCurrentlySnapshot(reason: string): CurrentlySnapshot {
  const fallback = parseCurrentlySingletonRow({
    body_mdx: CURRENTLY_FALLBACK_BODY,
    updated_at: null,
  } as SingletonRow);
  fallback.warnings = [...fallback.warnings, reason];
  return fallback;
}
