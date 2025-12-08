import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getMdxContent } from '@/lib/mdx/render';
import { RenderContent } from '@/lib/mdx/render-content';
import { fetchArticleBySlug, fetchArticleSummaries } from '@/lib/supabase/articles';
import { slugParamSchema } from '@/lib/validation/params';
import type { AppPageProps } from '@/types/routes';

// Cache writing entries for 5 minutes to balance Supabase freshness with ISR hits.
export const revalidate = 300;

type WritingPageParams = { slug: string };
type WritingPageContext = AppPageProps<WritingPageParams>;

export async function generateMetadata({ params }: WritingPageContext): Promise<Metadata> {
  const slug = resolveSlug(await params);
  if (!slug) {
    return { title: 'Writing' };
  }

  const article = await fetchArticleBySlug(slug);
  if (!article) {
    return {
      title: 'Writing',
    };
  }
  return {
    title: `${article.title} | Writing`,
    description: article.subtitle || `Read ${article.title} on EVA Terminal`,
  };
}

export default async function WritingArticlePage({ params }: WritingPageContext) {
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
    <main className="writing-article">
      <div className="writing-article__hero">
        <p className="writing-article__eyebrow">Writing</p>
        <h1>{article.title}</h1>
        {article.subtitle ? <p className="writing-article__subtitle">{article.subtitle}</p> : null}
        <p className="writing-article__meta">
          Updated:{' '}
          {new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }).format(new Date(article.publishedAt ?? Date.now()))}
        </p>
      </div>
      <article className="writing-article__content">
        <RenderContent Content={Content} />
      </article>
    </main>
  );
}

export async function generateStaticParams() {
  const articles = await fetchArticleSummaries();
  return articles.map((article) => ({ slug: article.slug }));
}

function resolveSlug(params: WritingPageParams) {
  const parsed = slugParamSchema.safeParse(params);
  return parsed.success ? parsed.data.slug : null;
}
