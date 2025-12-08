import {
  TERMINAL_LABEL_WIDTH,
  TERMINAL_LINE_WIDTH,
  TERMINAL_VALUE_WIDTH,
} from '@/lib/terminal/line-width';
import type { TerminalLineKind } from '@/lib/terminal/use-typewriter';

import type { BioBulletItem, BioFieldItem, BioSection, BioSnapshot } from './bio.types';

type Line = {
  text: string;
  kind?: TerminalLineKind;
};

const INNER_WIDTH = TERMINAL_LINE_WIDTH;
const LABEL_WIDTH = TERMINAL_LABEL_WIDTH;
const VALUE_WIDTH = TERMINAL_VALUE_WIDTH;
const BULLET = '\u2022';
const ELLIPSIS = '\u2026';
const SECTION_BREAK = '\u2014';
const HEADER_TITLE = 'MAGI ADMIN CREDENTIALS:';

const sectionTitle = (label: string) => `${label.toUpperCase()}:`;

const clamp = (value: string, length: number) =>
  value.length > length ? `${value.slice(0, length - 1)}${ELLIPSIS}` : value;

const formatField = (label: string, value: string) => {
  const key = `${label.toUpperCase()}`.slice(0, LABEL_WIDTH);
  const fieldValue = clamp(value, VALUE_WIDTH);
  return `${key}: ${fieldValue}`;
};

const formatContent = (value: string) => clamp(value, INNER_WIDTH);

const formatBullet = (value: string) => formatContent(`${BULLET} ${value}`);

const renderSectionItems = (section: BioSection): Line[] => {
  if (!section.items.length) {
    return [
      {
        text: formatContent('No entries found. Add content in the admin console.'),
        kind: 'muted',
      },
    ];
  }

  return section.items.map((item) => {
    if (item.kind === 'field') {
      return {
        text: formatField(item.label, item.value),
        kind: 'output' as const,
      };
    }

    return {
      text: formatBullet(item.text),
      kind: 'muted' as const,
    };
  });
};

type BuildBioLinesOptions = {
  errorMessage?: string | null;
};

const buildSectionBlock = (section: BioSection): Line[] => [
  {
    text: sectionTitle(section.title),
    kind: 'system',
  },
  ...renderSectionItems(section),
];

export const buildBioLines = (
  snapshot: BioSnapshot | null,
  options: BuildBioLinesOptions = {},
): Line[] => {
  const lines: Line[] = [{ text: HEADER_TITLE, kind: 'system' }];

  if (options.errorMessage) {
    lines.push({
      text: formatContent(options.errorMessage),
      kind: 'error',
    });
  }

  if (!snapshot || snapshot.sections.length === 0) {
    lines.push({
      text: formatContent(
        'Bio content has not been configured. Add entries via the admin console.',
      ),
      kind: 'muted',
    });
  } else {
    if (snapshot.warnings.length) {
      snapshot.warnings.forEach((warning) => {
        lines.push({
          text: formatContent(`Warning: ${warning}`),
          kind: 'muted',
        });
      });
      lines.push({ text: SECTION_BREAK, kind: 'system' });
    }

    snapshot.sections.forEach((section, index) => {
      if (index === 0 && section.items.length) {
        const stats = section.items.filter((item): item is BioFieldItem => item.kind === 'field');
        if (stats.length) {
          stats.forEach((item) => {
            lines.push({
              text: formatField(item.label, item.value),
              kind: 'output',
            });
          });

          const nonFieldItems = section.items.filter(
            (item): item is BioBulletItem => item.kind === 'bullet',
          );
          if (nonFieldItems.length) {
            lines.push({ text: SECTION_BREAK, kind: 'system' });
            lines.push({
              text: sectionTitle(section.title),
              kind: 'system',
            });
            nonFieldItems.forEach((item) =>
              lines.push({ text: formatBullet(item.text), kind: 'muted' }),
            );
          }
          return;
        }
      }

      lines.push(...buildSectionBlock(section));
    });
  }

  return lines;
};
