import { unstable_cache } from 'next/cache';

import { serverEnv } from '@/lib/env.server';
import { BIO_FALLBACK_BODY } from '@/lib/fallbacks/bio';
import { createLogger } from '@/lib/logger';
import { getSupabaseReadonlyClient, SupabaseEnvError } from '@/lib/supabase/server-client';

import type { BioBulletItem, BioFieldItem, BioSection, BioSnapshot } from './bio.types';

type SingletonRow = {
  body_mdx: string | null;
  updated_at: string | null;
};

type ParsedLine = BioFieldItem | BioBulletItem;

type ParseContext = {
  sections: BioSection[];
  current: BioSection | null;
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
      return `${trimmedLabel} → ${trimmedUrl}`;
    })
    .replace(BOLD_PATTERN, '$1')
    .replace(EMPHASIS_PATTERN, '$1')
    .replace(CODE_PATTERN, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isFieldLine = (value: string) => {
  const colonIndex = value.indexOf(':');
  if (colonIndex === -1) {
    return false;
  }
  const label = value.slice(0, colonIndex).trim();
  if (!label || /https?:$/i.test(label)) {
    return false;
  }
  return true;
};

const parseLine = (value: string): ParsedLine => {
  const sanitized = sanitize(value);
  if (!sanitized) {
    return { kind: 'bullet', text: '' } satisfies BioBulletItem;
  }
  if (isFieldLine(sanitized)) {
    const [label, ...rest] = sanitized.split(':');
    return {
      kind: 'field',
      label: label.trim(),
      value: rest.join(':').trim(),
    } satisfies BioFieldItem;
  }
  return { kind: 'bullet', text: sanitized } satisfies BioBulletItem;
};

const ensureSection = (context: ParseContext, title: string) => {
  if (!context.current) {
    context.current = {
      title,
      items: [],
    } satisfies BioSection;
    context.sections.push(context.current);
    return;
  }

  if (context.current.title !== title) {
    context.current = {
      title,
      items: [],
    } satisfies BioSection;
    context.sections.push(context.current);
  }
};

const pushItem = (context: ParseContext, item: ParsedLine) => {
  if (!context.current) {
    context.current = {
      title: 'Bio',
      items: [],
    } satisfies BioSection;
    context.sections.push(context.current);
  }
  context.current.items.push(item);
};

const createInitialContext = (): ParseContext => ({
  sections: [],
  current: null,
});

const finalizeContext = (context: ParseContext): BioSection[] => {
  return context.sections.map((section) => ({
    ...section,
    title: section.title.trim() || 'Bio',
    items: section.items.filter((item) => {
      if (item.kind === 'field') {
        return Boolean(item.label) && Boolean(item.value);
      }
      return Boolean(item.text);
    }),
  }));
};

const parseBodyToSections = (
  body: string,
): {
  sections: BioSection[];
  warnings: string[];
} => {
  const context = createInitialContext();
  const warnings: string[] = [];
  const lines = body.split(/\r?\n/);

  lines.forEach((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      return;
    }

    const headingMatch = trimmed.match(/^#{2,6}\s+(.+)$/);
    if (headingMatch) {
      const heading = sanitize(headingMatch[1]);
      if (heading) {
        context.current = {
          title: heading,
          items: [],
        } satisfies BioSection;
        context.sections.push(context.current);
      }
      return;
    }

    if (trimmed.startsWith('- ')) {
      pushItem(context, parseLine(trimmed.slice(2)));
      return;
    }

    if (!context.current) {
      ensureSection(context, 'Bio');
    }

    pushItem(context, parseLine(trimmed));
  });

  const sections = finalizeContext(context).filter((section) => section.items.length);
  if (!sections.length) {
    warnings.push('Bio singleton did not include any parsable entries.');
  }

  return { sections, warnings };
};

export function parseBioSingletonRow(row: SingletonRow | null): BioSnapshot {
  const rawBody = row?.body_mdx ?? null;
  const updatedAt = row?.updated_at ?? null;

  if (!rawBody || !rawBody.trim()) {
    return {
      sections: [],
      warnings: rawBody
        ? ['Bio singleton is present but empty.']
        : ['Bio singleton is missing. Seed content via the admin dashboard.'],
      updatedAt,
      rawBody,
    } satisfies BioSnapshot;
  }

  const { sections, warnings } = parseBodyToSections(rawBody);

  return {
    sections,
    warnings,
    updatedAt,
    rawBody,
  } satisfies BioSnapshot;
}

export async function fetchBioSingleton(): Promise<BioSnapshot> {
  if (serverEnv.SUPABASE_DISABLED_FOR_TESTS) {
    return buildFallbackBioSnapshot('Supabase client disabled for tests.');
  }
  try {
    const client = getSupabaseReadonlyClient();
    const { data: row, error } = await client
      .from('singletons')
      .select('body_mdx, updated_at')
      .eq('key', 'bio')
      .maybeSingle();

    if (error) {
      throw error;
    }

    const snapshot = parseBioSingletonRow(row ?? null);
    if (snapshot.sections.length) {
      return snapshot;
    }

    return buildFallbackBioSnapshot(
      'Bio singleton was empty or unparsable. Showing fallback copy.',
    );
  } catch (error) {
    if (error instanceof SupabaseEnvError) {
      return buildFallbackBioSnapshot(error.message);
    }
    createLogger({ scope: 'terminal:bio' }).warn('Bio fallback engaged', error);
    return buildFallbackBioSnapshot('Supabase request failed. Showing fallback copy.');
  }
}

export const fetchBioSingletonCached = unstable_cache(fetchBioSingleton, ['bio:snapshot'], {
  revalidate: 300,
  tags: ['bio', 'singletons'],
});

function buildFallbackBioSnapshot(reason: string): BioSnapshot {
  const fallback = parseBioSingletonRow({
    body_mdx: BIO_FALLBACK_BODY,
    updated_at: null,
  });
  fallback.warnings = [...fallback.warnings, reason];
  return fallback;
}
