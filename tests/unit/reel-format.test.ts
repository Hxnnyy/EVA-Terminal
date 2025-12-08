import { describe, expect, it } from 'vitest';

import { buildReelLines } from '@/lib/terminal/commands/reel';

describe('buildReelLines', () => {
  it('prints reel entries', () => {
    const lines = buildReelLines([
      { id: '1', url: 'https://example.com/a.jpg', caption: 'Frame A', order: 0 },
    ]);
    const text = lines.map((line) => line.text);
    expect(text[0]).toContain('+');
    expect(text.some((line) => line.includes('Frame A'))).toBe(true);
    expect(text.at(-2)).toContain('Reel viewer opened');
  });
});
