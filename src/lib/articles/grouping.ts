import type { ArticleSummary } from '@/lib/supabase/articles';

type ArticleListEntry = Pick<ArticleSummary, 'id' | 'slug' | 'title' | 'subtitle' | 'publishedAt'>;

export type ArticleMonthGroup = {
  id: string;
  label: string;
  month: number;
  year: number;
  entries: ArticleListEntry[];
};

export function groupArticlesByMonth(articles: ArticleListEntry[]): ArticleMonthGroup[] {
  const sorted = [...articles].sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });

  const groups = new Map<string, ArticleMonthGroup>();

  for (const article of sorted) {
    const date = article.publishedAt ? new Date(article.publishedAt) : new Date();
    const month = date.getMonth();
    const year = date.getFullYear();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;

    if (!groups.has(key)) {
      const formatter = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      });
      groups.set(key, {
        id: key,
        label: formatter.format(date),
        month,
        year,
        entries: [],
      });
    }

    groups.get(key)?.entries.push(article);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.year === b.year) {
      return b.month - a.month;
    }
    return b.year - a.year;
  });
}
