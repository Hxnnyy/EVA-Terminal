import { env } from '@/lib/env';
import type { TerminalLineKind } from '@/lib/terminal/use-typewriter';

export type WritingSummary = {
  slug: string;
  title: string;
  subtitle: string | null;
  publishedAt: string | null;
};

type Line = {
  text: string;
  kind?: TerminalLineKind;
  segments?: { text: string; kind?: TerminalLineKind; href?: string }[];
};

const FALLBACK_SITE_URL = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

const formatDate = (iso: string | null) => {
  if (!iso) {
    return 'Unknown';
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

const getSiteOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return FALLBACK_SITE_URL;
};

const buildArticleUrl = (slug: string) => `${getSiteOrigin()}/articles/${slug}`;

export const buildWritingListLines = (entries: WritingSummary[]): Line[] => {
  const lines: Line[] = [{ text: 'RETRIEVING ARTICLE DOSSIER...', kind: 'system' }];

  if (!entries.length) {
    lines.push({
      text: 'No published articles yet. Check back soon!',
      kind: 'muted',
    });
    return lines;
  }

  entries.forEach((entry, index) => {
    const rank = (index + 1).toString().padStart(2, '0');
    const url = buildArticleUrl(entry.slug);

    lines.push({
      text: `${rank}. ${entry.title}`,
      kind: 'output',
      segments: [
        { text: `${rank}. `, kind: 'accent' },
        { text: entry.title, kind: 'output', href: url },
      ],
    });

    const subtitle = entry.subtitle?.trim();
    if (subtitle) {
      lines.push({ text: subtitle, kind: 'muted' });
    }

    lines.push({
      text: `Updated: ${formatDate(entry.publishedAt)}`,
      kind: 'accent',
    });
  });

  return lines;
};
