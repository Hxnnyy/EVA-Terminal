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

const formatTip = (prefix: string, body: string) =>
  formatRow(`${prefix.padEnd(10, ' ')} :: ${body}`);

export const buildThemeTipsLines = (): Line[] => {
  const lines: Line[] = [
    { text: divider('='), kind: 'system' },
    { text: formatHeading('RETRIEVING MAGI USAGE GUIDANCE...'), kind: 'system' },
    { text: divider('-'), kind: 'system' },
    {
      text: formatTip('Themes', '/eoe, /eva01, /eva02, /eva00'),
      kind: 'output',
    },
    {
      text: formatTip('Toggle', '/reduce-motion on|off    /streaming on|off'),
      kind: 'output',
    },
    {
      text: formatTip('Commands', 's = skip, f = fast-forward'),
      kind: 'output',
    },
    {
      text: formatTip('Menu', 'Run /start to recall options'),
      kind: 'muted',
    },
    { text: divider('-'), kind: 'system' },
    {
      text: formatRow('Tip: swap themes mid-session to preview wipes.'),
      kind: 'muted',
    },
    { text: divider('='), kind: 'system' },
  ];

  return lines;
};
