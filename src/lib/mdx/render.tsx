import { run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';

import { articlesMdxComponents } from '@/components/articles/mdx-components';
import { compileMdx } from '@/lib/mdx/compile';

import { type MdxContentComponent, RenderContent } from './render-content';

export async function getMdxContent(source: string): Promise<MdxContentComponent> {
  const compiled = await compileMdx(source);
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
