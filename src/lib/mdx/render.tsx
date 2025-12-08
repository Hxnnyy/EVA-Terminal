import { compile } from '@mdx-js/mdx';
import { run } from '@mdx-js/mdx';
import type { Schema } from 'hast-util-sanitize';
import { defaultSchema } from 'hast-util-sanitize';
import * as runtime from 'react/jsx-runtime';
import rehypePrism from 'rehype-prism-plus';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { articlesMdxComponents } from '@/components/articles/mdx-components';

import { type MdxContentComponent, RenderContent } from './render-content';

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

export async function getMdxContent(source: string): Promise<MdxContentComponent> {
  const compiled = await compile(source, {
    outputFormat: 'function-body',
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypePrism, [rehypeSanitize, extendedSchema]],
  });
  const { default: Content } = await run(compiled, runtime);

  const MDXContent: MdxContentComponent = (props = {}) => (
    <RenderContent
      Content={Content as MdxContentComponent}
      components={articlesMdxComponents}
      {...props}
    />
  );

  return MDXContent;
}
