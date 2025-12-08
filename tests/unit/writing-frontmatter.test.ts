import { describe, expect, it } from 'vitest';

import { parseWritingMdx } from '@/lib/content/writing';

const BASE_META = {
  title: 'Fallback Title',
  subtitle: 'Fallback Subtitle',
  publishedAt: '2025-01-01T00:00:00Z',
};

describe('parseWritingMdx', () => {
  it('merges validated frontmatter with fallback meta and strips the frontmatter block', () => {
    const source = `---
title: Frontmatter Title
subtitle: Frontmatter Subtitle
publishedAt: 2025-02-02T12:34:56Z
tags:
  - eva
  - terminal
---
# Heading

Body content here.`;

    const parsed = parseWritingMdx(source, BASE_META);

    expect(parsed.meta.title).toBe('Frontmatter Title');
    expect(parsed.meta.subtitle).toBe('Frontmatter Subtitle');
    expect(parsed.meta.publishedAt).toBe('2025-02-02T12:34:56.000Z');
    expect(parsed.meta.tags).toEqual(['eva', 'terminal']);
    expect(parsed.body).not.toContain('---');
    expect(parsed.body.trim().startsWith('# Heading')).toBe(true);
  });

  it('throws a helpful error when frontmatter fails validation', () => {
    const source = `---
publishedAt: not-a-date
---
Body content`;

    expect(() => parseWritingMdx(source, { title: 'Fallback Title' })).toThrowError(
      /Invalid writing frontmatter/i,
    );
  });
});
