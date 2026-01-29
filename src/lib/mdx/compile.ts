import { compile } from '@mdx-js/mdx';
import type { Schema } from 'hast-util-sanitize';
import { defaultSchema } from 'hast-util-sanitize';
import rehypePrism from 'rehype-prism-plus';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

const extendedSchema: Schema = {
  ...defaultSchema,
  tagNames: Array.from(
    new Set([...(defaultSchema.tagNames ?? []), 'figure', 'figcaption', 'img', 'video', 'source']),
  ),
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), 'href', 'title', 'target', 'rel', 'aria-label'],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      'src',
      'alt',
      'title',
      'width',
      'height',
      'loading',
      'data-align',
    ],
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    pre: [...(defaultSchema.attributes?.pre ?? []), 'className'],
  },
};

export async function compileMdx(source: string) {
  return compile(source ?? '', {
    outputFormat: 'function-body',
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypePrism, [rehypeSanitize, extendedSchema]],
  });
}
