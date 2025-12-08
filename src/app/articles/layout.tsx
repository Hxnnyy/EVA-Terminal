import type { ReactNode } from 'react';

import { ArticlesShell } from '@/components/articles/articles-shell';
import { groupArticlesByMonth } from '@/lib/articles/grouping';
import { fetchArticleSummaries } from '@/lib/supabase/articles';

export const metadata = {
  title: 'Articles',
};

export type ArticlesLayoutProps = {
  children: ReactNode;
  params?: Promise<{ slug?: string }>;
};

export default async function ArticlesLayout({ children, params }: ArticlesLayoutProps) {
  const summaries = await fetchArticleSummaries();
  const groups = groupArticlesByMonth(summaries);
  const resolvedParams = params ? await params : undefined;
  const activeSlug = resolvedParams?.slug;

  return (
    <div className="articles-layout">
      <ArticlesShell groups={groups} activeSlug={activeSlug}>
        {children}
      </ArticlesShell>
    </div>
  );
}
