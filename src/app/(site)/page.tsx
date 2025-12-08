// Home page uses dynamic data (onepager content from Supabase)
export const dynamic = 'force-dynamic';

import { BackgroundGrid } from '@/components/background/background-grid';
import { TerminalShell } from '@/components/terminal/terminal-shell';
import { OnepagerContentServer } from '@/features/terminal/components/onepager-content-server';
import { OnepagerOverlay } from '@/features/terminal/components/onepager-overlay';
import { shouldTriggerError } from '@/lib/errors/should-trigger-error';
import type { SearchParams } from '@/types/routes';

type HomePageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (shouldTriggerError(resolvedSearchParams)) {
    throw new Error('Home boundary drill triggered');
  }

  return (
    <>
      <BackgroundGrid />
      <TerminalShell />
      <OnepagerOverlay>
        <OnepagerContentServer />
      </OnepagerOverlay>
    </>
  );
}
