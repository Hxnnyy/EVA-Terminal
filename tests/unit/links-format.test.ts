import { describe, expect, it } from 'vitest';

import type { LinkRecord } from '@/lib/supabase/links';
import { buildLinksErrorLines, buildLinksSuccessLines } from '@/lib/terminal/commands/links';

const sampleLinks: LinkRecord[] = [
  {
    id: '1',
    category: 'social',
    label: 'GitHub',
    url: 'https://github.com/your-username',
    order: 1,
  },
  {
    id: '2',
    category: 'site',
    label: 'Portfolio',
    url: 'https://example.dev',
    order: 2,
  },
];

describe('buildLinksSuccessLines', () => {
  it('renders grouped link categories', () => {
    const lines = buildLinksSuccessLines(sampleLinks);
    const text = lines.map((line) => line.text);

    expect(text[0]).toContain('GitHub:');
    expect(text.some((line) => line.includes('Portfolio: https://'))).toBe(true);
  });

  it('falls back to empty messaging when no links exist', () => {
    const lines = buildLinksSuccessLines([]);
    expect(lines[0]?.text).toContain('No outbound links');
  });
});

describe('buildLinksErrorLines', () => {
  it('surfaces API error messages', () => {
    const lines = buildLinksErrorLines('Links registry offline.');
    expect(lines[0]).toMatchObject({ kind: 'error' });
    expect(lines[1]?.text).toContain('Links registry offline.');
  });
});
