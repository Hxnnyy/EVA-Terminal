import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getMdxContent } from '@/lib/mdx/render';
import { RenderContent } from '@/lib/mdx/render-content';
import { fetchArticleBySlug, fetchArticleSummaries } from '@/lib/supabase/articles';
import { slugParamSchema } from '@/lib/validation/params';
import type { AppPageProps } from '@/types/routes';

export const revalidate = 300;

type ArticlePageParams = { slug: string };
type ArticlePageContext = AppPageProps<ArticlePageParams>;

export async function generateStaticParams() {
  const articles = await fetchArticleSummaries();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageContext): Promise<Metadata> {
  const slug = resolveSlug(await params);
  if (!slug) {
    return { title: 'Articles' };
  }

  const article = await fetchArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Articles',
    };
  }

  return {
    title: `${article.title} | Articles`,
    description: article.subtitle || `Read ${article.title} on EVA Terminal`,
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageContext) {
  const resolvedParams = await params;
  const slug = resolveSlug(resolvedParams);
  if (!slug) {
    notFound();
  }

  const article = await fetchArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const Content = await getMdxContent(article.bodyMdx);

  return (
    <article className="writing-article articles-reader">
      <header className="writing-article__hero">
        <p className="writing-article__eyebrow">Articles</p>
        <h1>{article.title}</h1>
        {article.subtitle ? <p className="writing-article__subtitle">{article.subtitle}</p> : null}
        {article.publishedAt ? (
          <p className="writing-article__meta">
            Updated{' '}
            {new Intl.DateTimeFormat('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }).format(new Date(article.publishedAt))}
          </p>
        ) : null}
      </header>
      <div className="writing-article__content">
        <RenderContent Content={Content} />
      </div>
    </article>
  );
}

function resolveSlug(params: ArticlePageParams) {
  const parsed = slugParamSchema.safeParse(params);
  return parsed.success ? parsed.data.slug : null;
}
