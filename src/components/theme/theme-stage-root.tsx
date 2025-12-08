'use client';

import type { PropsWithChildren } from 'react';

import { ThemeStageProvider } from '@/lib/theme/theme-stage';

export function ThemeStageRoot({ children }: PropsWithChildren) {
  return <ThemeStageProvider>{children}</ThemeStageProvider>;
}
