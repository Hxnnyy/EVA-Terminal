import { describe, expectTypeOf, it } from 'vitest';

import type { ArticlesLayoutProps } from '@/app/articles/layout';
import { type SearchParams } from '@/types/routes';

type WritingPage = typeof import('@/app/writing/[slug]/page').default;
type ArticlePage = typeof import('@/app/articles/[slug]/page').default;
type ProjectPage = typeof import('@/app/projects/[slug]/page').default;
type ArticlesLayout = typeof import('@/app/articles/layout').default;
type WritingDetailGet = typeof import('@/app/api/writing/[slug]/route').GET;
type AdminArticleGet = typeof import('@/app/api/admin/articles/[id]/route').GET;

describe('Next.js route params typing', () => {
  it('writing route exposes Promise-based params and searchParams', () => {
    type WritingContext = Parameters<WritingPage>[0];

    expectTypeOf<WritingContext['params']>().toEqualTypeOf<Promise<{ slug: string }>>();
    expectTypeOf<WritingContext['searchParams']>().toEqualTypeOf<
      Promise<SearchParams> | undefined
    >();
  });

  it('articles route exposes Promise-based params and searchParams', () => {
    type ArticleContext = Parameters<ArticlePage>[0];

    expectTypeOf<ArticleContext['params']>().toEqualTypeOf<Promise<{ slug: string }>>();
    expectTypeOf<ArticleContext['searchParams']>().toEqualTypeOf<
      Promise<SearchParams> | undefined
    >();
  });

  it('projects route exposes Promise-based params and searchParams', () => {
    type ProjectContext = Parameters<ProjectPage>[0];

    expectTypeOf<ProjectContext['params']>().toEqualTypeOf<Promise<{ slug: string }>>();
    expectTypeOf<ProjectContext['searchParams']>().toEqualTypeOf<
      Promise<SearchParams> | undefined
    >();
  });

  it('articles layout params are a Promise', () => {
    type LayoutProps = Parameters<ArticlesLayout>[0];

    expectTypeOf<ArticlesLayoutProps['params']>().toEqualTypeOf<
      Promise<{ slug?: string }> | undefined
    >();
    expectTypeOf<LayoutProps['params']>().toEqualTypeOf<Promise<{ slug?: string }> | undefined>();
  });

  it('API route contexts enforce Promise-based params', () => {
    type WritingApiContext = Parameters<WritingDetailGet>[1];
    type AdminArticleContext = Parameters<AdminArticleGet>[1];

    expectTypeOf<WritingApiContext['params']>().toEqualTypeOf<Promise<{ slug: string }>>();
    expectTypeOf<AdminArticleContext['params']>().toEqualTypeOf<Promise<{ id: string }>>();
  });
});
