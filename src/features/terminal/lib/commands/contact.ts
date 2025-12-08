import { TERMINAL_LINE_WIDTH } from '@/lib/terminal/line-width';
import type { TerminalLineKind } from '@/lib/terminal/use-typewriter';

type ContactInfo = {
  email: string;
  phone?: string;
  discord?: string;
};

type Line = {
  text: string;
  kind?: TerminalLineKind;
  segments?: { text: string; kind?: TerminalLineKind; href?: string }[];
};

const INNER_WIDTH = TERMINAL_LINE_WIDTH;
const divider = (char: string) => `+${char.repeat(INNER_WIDTH)}+`;

const formatRow = (value: string) => `| ${value.padEnd(INNER_WIDTH, ' ')} |`;

const formatField = (label: string, value: string) => {
  const prefix = `${label.toUpperCase()}:`.padEnd(10, ' ');
  const display = `${prefix}${value}`;
  return formatRow(display);
};

const buildSegments = (label: string, value: string, href?: string): Line['segments'] => [
  { text: `${label.toUpperCase()}:`, kind: 'system' },
  { text: ` ${value}`, kind: 'output', ...(href ? { href } : {}) },
];

export const buildContactLines = (info: ContactInfo): Line[] => {
  const lines: Line[] = [
    { text: 'RETRIEVING ADMIN CONTACT DETAILS...', kind: 'system' },
    { text: divider('-'), kind: 'system' },
    {
      text: formatField('Email', info.email),
      kind: 'output',
      segments: buildSegments('EMAIL', info.email, `mailto:${info.email}`),
    },
  ];

  if (info.phone) {
    lines.push({
      text: formatField('Phone', info.phone),
      kind: 'output',
      segments: buildSegments('PHONE', info.phone),
    });
  }
  if (info.discord) {
    lines.push({
      text: formatField('Discord', info.discord),
      kind: 'output',
      segments: buildSegments('DISCORD', info.discord),
    });
  }

  lines.push({ text: divider('-'), kind: 'system' });
  lines.push({
    text: formatRow('Tip: Command copies email to clipboard automatically.'),
    kind: 'muted',
  });
  lines.push({ text: divider('='), kind: 'system' });

  return lines;
};

export const buildContactErrorLines = (message: string): Line[] => [
  { text: 'Contact module failed to load.', kind: 'error' },
  { text: message, kind: 'muted' },
];
