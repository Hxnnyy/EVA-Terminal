/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { mdxToPlainParagraphs } from '@/lib/mdx/plaintext';
import { getMdxContent } from '@/lib/mdx/render';

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

describe('mdxToPlainParagraphs', () => {
  it('normalizes markdown into trimmed terminal-safe paragraphs', () => {
    const source = `
# Heading
Some **bold** text with [link](https://example.com) and *italic* words.

1. First item
2. Second item with \`code\`

<em>inline html</em>
`;

    const paragraphs = mdxToPlainParagraphs(source);
    expect(paragraphs).toEqual([
      'Heading Some bold text with link -> https://example.com and italic words. First item Second item with code inline html',
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(mdxToPlainParagraphs('  \n')).toEqual([]);
  });
});

describe('getMdxContent', () => {
  it('sanitizes unsafe tags while keeping allowed media and links', async () => {
    const mdx = `
# Media Block
<script>alert('xss')</script>
<img src="https://images.unsplash.com/photo.jpg" alt="hero" width="800" height="600" onerror="evil()" />
<video src="https://cdn.example.com/video.mp4" controls>
  <source src="https://cdn.example.com/video.mp4" type="video/mp4" />
</video>

[External](https://eva.terminal.dev)
`;

    // MDX compiled output expects React in scope when using the classic runtime.
    (globalThis as unknown as { React: typeof React }).React = React;

    const Content = await getMdxContent(mdx);
    const { container } = render(<Content />);

    expect(container.querySelector('script')).toBeNull();

    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://eva.terminal.dev');
    expect(link?.getAttribute('rel')).toContain('noreferrer');
  });
});
