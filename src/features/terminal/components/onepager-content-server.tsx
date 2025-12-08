import { ONEPAGER_FALLBACK } from '@/lib/fallbacks/onepager';
import { getMdxContent } from '@/lib/mdx/render';
import { fetchOnepagerCached } from '@/lib/supabase/onepager';

export async function OnepagerContentServer() {
  const data = await fetchOnepagerCached();
  const source = data?.bodyMdx || ONEPAGER_FALLBACK.bodyMdx;
  const Content = await getMdxContent(source);

  return (
    <article className="onepager-article">
      <Content />
    </article>
  );
}
