import type { ReactNode } from 'react';

import { ThemeStageRoot } from '@/components/theme/theme-stage-root';
import { OnepagerProvider } from '@/features/terminal/hooks/use-onepager';
import { ReelViewerProvider } from '@/features/terminal/hooks/use-reel-viewer';
import { ThemeProvider } from '@/lib/theme/theme-provider';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeStageRoot>
      <ThemeProvider>
        <OnepagerProvider>
          <ReelViewerProvider>{children}</ReelViewerProvider>
        </OnepagerProvider>
      </ThemeProvider>
    </ThemeStageRoot>
  );
}
