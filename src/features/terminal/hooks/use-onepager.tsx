'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useMobileViewport } from '@/features/terminal/hooks/use-mobile-viewport';
import { useThemeController } from '@/lib/theme/theme-provider';
import { useThemeStageControl } from '@/lib/theme/theme-stage';

type OnepagerState = {
  isOpen: boolean;
  isMobileForced: boolean; // True if opened because of mobile viewport
};

type OnepagerContextValue = {
  state: OnepagerState;
  open: () => void;
  close: () => void;
};

const OnepagerContext = createContext<OnepagerContextValue | null>(null);

export function OnepagerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnepagerState>({ isOpen: false, isMobileForced: false });
  const stageControl = useThemeStageControl();
  const { theme, reduceMotion } = useThemeController();
  const isMobile = useMobileViewport();

  // Auto-open onepager on mobile viewport (without animation)
  useEffect(() => {
    if (isMobile && !state.isOpen) {
      setState({ isOpen: true, isMobileForced: true });
    } else if (!isMobile && state.isMobileForced) {
      // Close if user resizes to desktop (only if we auto-opened it)
      setState({ isOpen: false, isMobileForced: false });
    }
  }, [isMobile, state.isOpen, state.isMobileForced]);

  const open = useCallback(() => {
    // Skip animation in reduced motion mode or if stage control unavailable
    if (reduceMotion || !stageControl) {
      setState({ isOpen: true, isMobileForced: false });
      return;
    }

    // Trigger the peel-away animation BEFORE showing overlay
    const { ready } = stageControl.begin({
      from: theme,
      to: theme,
    });

    // Show overlay after screenshot is captured (ready)
    void ready.then(() => {
      setState({ isOpen: true, isMobileForced: false });
    });
  }, [theme, reduceMotion, stageControl]);

  const close = useCallback(() => {
    // Don't allow closing on mobile (would show broken terminal)
    if (isMobile) return;
    setState({ isOpen: false, isMobileForced: false });
  }, [isMobile]);

  const value = useMemo<OnepagerContextValue>(() => ({ state, open, close }), [state, open, close]);

  return <OnepagerContext.Provider value={value}>{children}</OnepagerContext.Provider>;
}

export function useOnepager() {
  const ctx = useContext(OnepagerContext);
  if (!ctx) {
    throw new Error('useOnepager must be used within OnepagerProvider');
  }
  return ctx;
}
