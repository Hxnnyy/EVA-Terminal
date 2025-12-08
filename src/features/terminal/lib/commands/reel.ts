import { TERMINAL_LINE_WIDTH } from '@/lib/terminal/line-width';
import type { TerminalLineKind } from '@/lib/terminal/use-typewriter';

export type ReelItem = {
  id: string;
  url: string;
  caption: string | null;
  order: number;
};

type Line = {
  text: string;
  kind?: TerminalLineKind;
};

const INNER_WIDTH = TERMINAL_LINE_WIDTH;
const divider = (char: string) => `+${char.repeat(INNER_WIDTH)}+`;
const formatRow = (value: string) => `| ${value.padEnd(INNER_WIDTH, ' ')} |`;

export const buildReelLines = (items: ReelItem[]): Line[] => {
  if (!items.length) {
    return [
      { text: divider('='), kind: 'system' },
      { text: formatRow('VISUAL REEL // EVA TERMINAL'), kind: 'system' },
      { text: divider('-'), kind: 'system' },
      { text: formatRow('No captures yet. Upload images via /admin.'), kind: 'muted' },
      { text: divider('='), kind: 'system' },
    ];
  }

  const lines: Line[] = [
    { text: divider('='), kind: 'system' },
    { text: formatRow('VISUAL REEL // EVA TERMINAL'), kind: 'system' },
    { text: divider('-'), kind: 'system' },
  ];

  const sorted = [...items].sort((a, b) => a.order - b.order);

  sorted.slice(0, 6).forEach((item, index) => {
    lines.push({
      text: formatRow(`${(index + 1).toString().padStart(2, '0')}. ${item.caption ?? item.url}`),
      kind: 'output',
    });
  });

  lines.push({ text: divider('-'), kind: 'system' });
  lines.push({
    text: formatRow('Reel viewer opened. Use arrow keys or click thumbnails.'),
    kind: 'muted',
  });
  lines.push({ text: divider('='), kind: 'system' });

  return lines;
};

export const buildReelErrorLines = (message: string): Line[] => [
  { text: 'Reel module offline.', kind: 'error' },
  { text: message, kind: 'muted' },
];
