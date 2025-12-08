import type { CurrentlySnapshot } from '@/lib/terminal/commands/currently.server';
import { TERMINAL_LINE_WIDTH } from '@/lib/terminal/line-width';
import type { TerminalLineKind } from '@/lib/terminal/use-typewriter';

type Line = {
  text: string;
  kind?: TerminalLineKind;
};

const INNER_WIDTH = TERMINAL_LINE_WIDTH;

const divider = (char: string) => `+${char.repeat(INNER_WIDTH)}+`;

const formatRow = (value: string) => `| ${value.padEnd(INNER_WIDTH, ' ')} |`;

const formatHeading = (value: string) => formatRow(value.toUpperCase());

const formatItem = (value: string) => formatRow(`• ${value}`);

export const buildCurrentlyInitializingLines = (): Line[] => [];

export const buildCurrentlyErrorLines = (message: string): Line[] => [
  { text: 'Currently panel cannot be rendered.', kind: 'error' },
  { text: message, kind: 'muted' },
];

export const buildCurrentlyLines = (snapshot: CurrentlySnapshot): Line[] => {
  const lines: Line[] = [];

  snapshot.sections.forEach((section, index) => {
    if (index > 0) {
      lines.push({ text: divider('-'), kind: 'system' });
    }
    lines.push({
      text: formatHeading(section.title),
      kind: 'system',
    });
    section.items.forEach((item) => {
      lines.push({
        text: formatItem(item),
        kind: 'output',
      });
    });
  });

  lines.push({ text: divider('-'), kind: 'system' });

  return lines;
};
