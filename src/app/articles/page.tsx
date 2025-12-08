import { redirect } from 'next/navigation';

import { shouldTriggerError } from '@/lib/errors/should-trigger-error';
import { fetchArticleSummaries } from '@/lib/supabase/articles';
import type { SearchParams } from '@/types/routes';

export const revalidate = 300;

type ArticlesIndexPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

export default async function ArticlesIndexPage({ searchParams }: ArticlesIndexPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (shouldTriggerError(resolvedSearchParams)) {
    throw new Error('Articles boundary drill triggered');
  }

  const summaries = await fetchArticleSummaries();
  const first = summaries[0];

  if (first) {
    redirect(`/articles/${first.slug}`);
  }

  return (
    <div className="articles-empty">
      <p className="articles-placeholder__eyebrow">Articles</p>
      <h1>Archive not yet initialized.</h1>
      <p>Publish your first article via the admin dashboard to activate this space.</p>
    </div>
  );
}
