import type { ReactNode } from 'react';

import { ArticlesSidebar } from '@/components/articles/articles-sidebar';
import type { ArticleMonthGroup } from '@/lib/articles/grouping';

type ArticlesShellProps = {
  groups: ArticleMonthGroup[];
  activeSlug?: string;
  children: ReactNode;
};

export function ArticlesShell({ groups, activeSlug, children }: ArticlesShellProps) {
  return (
    <div className="articles-shell">
      <aside className="articles-shell__sidebar">
        <ArticlesSidebar groups={groups} activeSlug={activeSlug} />
      </aside>
      <section className="articles-shell__reader">
        <div className="articles-shell__reader-surface">{children}</div>
      </section>
    </div>
  );
}
