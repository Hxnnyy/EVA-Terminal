'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

import { TerminalBootOverlay } from '@/components/terminal/terminal-boot-overlay';
import { useMobileViewport } from '@/features/terminal/hooks/use-mobile-viewport';
import { usePrefersReducedMotion } from '@/features/terminal/hooks/use-prefers-reduced-motion';
import { useThemeController } from '@/lib/theme/theme-provider';

const TerminalShellClient = dynamic(
  () => import('./terminal-shell-client').then((mod) => mod.TerminalShellClient),
  {
    ssr: false,
    loading: () => <TerminalShellBootSkeleton />,
  },
);

export function TerminalShellLazy() {
  const { reduceMotion: themeReduceMotion } = useThemeController();
  const prefersReducedMotion = usePrefersReducedMotion();
  const reduceMotion = prefersReducedMotion || themeReduceMotion;
  const isMobile = useMobileViewport();

  useEffect(() => {
    if (reduceMotion) return;

    document.body.classList.add('boot-hidden');
    return () => {
      document.body.classList.remove('boot-hidden');
    };
  }, [reduceMotion]);

  // Don't render terminal on mobile - onepager will cover it anyway
  // This prevents the boot animation flash
  if (isMobile) {
    return null;
  }

  return <TerminalShellClient />;
}

function TerminalShellBootSkeleton() {
  return (
    <TerminalBootOverlay
      visible
      fading={false}
      lines={[]}
      ready={false}
      readyText=""
      reduceMotion={false}
    />
  );
}
