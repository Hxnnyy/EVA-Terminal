import { describe, expect, it } from 'vitest';

import { buildCurrentlyLines } from '@/lib/terminal/commands/currently';
import {
  type CurrentlySnapshot,
  parseCurrentlySingletonRow,
} from '@/lib/terminal/commands/currently.server';

const SAMPLE_BODY = `### Playing
- Armored Core VI

### Watching
- Shin Evangelion
`;

describe('parseCurrentlySingletonRow', () => {
  it('parses headings and bullet items into sections', () => {
    const snapshot = parseCurrentlySingletonRow({
      body_mdx: SAMPLE_BODY,
      updated_at: '2025-01-01T00:00:00Z',
    });

    expect(snapshot.sections).toHaveLength(2);
    expect(snapshot.sections[0]).toEqual({
      title: 'Playing',
      items: ['Armored Core VI'],
    });
    expect(snapshot.sections[1]?.items[0]).toBe('Shin Evangelion');
    expect(snapshot.warnings).toEqual([]);
  });

  it('returns warnings when no content is available', () => {
    const snapshot = parseCurrentlySingletonRow({
      body_mdx: '   ',
      updated_at: null,
    });
    expect(snapshot.sections).toHaveLength(0);
    expect(snapshot.warnings).not.toHaveLength(0);
  });
});

describe('buildCurrentlyLines', () => {
  it('renders terminal-safe blocks for snapshot data', () => {
    const snapshot: CurrentlySnapshot = parseCurrentlySingletonRow({
      body_mdx: SAMPLE_BODY,
      updated_at: null,
    });
    const lines = buildCurrentlyLines(snapshot);
    const textLines = lines.map((line) => line.text);

    expect(textLines.length).toBeGreaterThan(0);
    expect(textLines.some((line) => line.includes('PLAYING'))).toBe(true);
    expect(textLines.some((line) => line.includes('Armored Core VI'))).toBe(true);
  });
});
