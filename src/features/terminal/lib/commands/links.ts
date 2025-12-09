import type { LinkRecord } from '@/lib/supabase/links';
import type { TerminalLineKind } from '@/lib/terminal/use-typewriter';

type Line = {
  text: string;
  kind?: TerminalLineKind;
};

const groupByCategory = (links: LinkRecord[]) =>
  links.reduce<Record<LinkRecord['category'], LinkRecord[]>>(
    (acc, link) => {
      if (!acc[link.category]) {
        acc[link.category] = [];
      }
      acc[link.category]!.push(link);
      return acc;
    },
    { social: [], site: [], other: [] },
  );

export const buildLinksInitializingLines = (): Line[] => [
  { text: 'RETRIEVING LINK MATRIX...', kind: 'system' },
];

export const buildLinksErrorLines = (message: string): Line[] => [
  { text: 'Link registry unavailable.', kind: 'error' },
  { text: message, kind: 'muted' },
];

const formatLinkLine = (entry: LinkRecord) => `${entry.label}: ${entry.url}`;

export const buildLinksSuccessLines = (links: LinkRecord[]): Line[] => {
  if (!links.length) {
    return [
      {
        text: 'No outbound links are configured yet. Check back soon!',
        kind: 'muted',
      },
    ];
  }

  const grouped = groupByCategory(links);
  const lines: Line[] = [];

  (Object.keys(grouped) as Array<LinkRecord['category']>).forEach((category) => {
    const entries = grouped[category];
    if (!entries.length) {
      return;
    }
    entries.forEach((entry) =>
      lines.push({
        text: formatLinkLine(entry),
        kind: 'output',
      }),
    );
  });

  return lines;
};
