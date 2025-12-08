'use client';

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DEFAULT_THEME_ID,
  THEME_CLASS_PREFIX,
  THEME_LIST,
  type ThemeId,
} from '@/lib/theme/theme-manifest';
import { useThemeStageControl } from '@/lib/theme/theme-stage';

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (next: ThemeId) => void;
  reduceMotion: boolean;
  setReduceMotion: (next: boolean) => void;
};

const THEME_STORAGE_KEY = 'eva-terminal.theme';
const REDUCE_MOTION_KEY = 'eva-terminal.reduce-motion';

const FALLBACK_THEME: ThemeId = DEFAULT_THEME_ID;

const KNOWN_THEMES: ThemeId[] = THEME_LIST.map((theme) => theme.id);

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, internalSetTheme] = useState<ThemeId>(FALLBACK_THEME);
  const [reduceMotion, internalSetReduceMotion] = useState<boolean>(false);
  const stageControl = useThemeStageControl();

  const themeRef = useRef<ThemeId>(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (storedTheme && KNOWN_THEMES.includes(storedTheme)) {
      internalSetTheme(storedTheme);
      themeRef.current = storedTheme;
    }

    const storedReduceMotion = window.localStorage.getItem(REDUCE_MOTION_KEY);
    if (storedReduceMotion !== null) {
      internalSetReduceMotion(storedReduceMotion === 'true');
    } else {
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      if (prefersReduced?.matches) {
        internalSetReduceMotion(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const classList = document.body.classList;
    KNOWN_THEMES.forEach((value) => {
      classList.remove(`${THEME_CLASS_PREFIX}${value}`);
    });
    classList.add(`${THEME_CLASS_PREFIX}${theme}`);
    document.body.setAttribute('data-reduce-motion', reduceMotion ? 'true' : 'false');
  }, [theme, reduceMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(REDUCE_MOTION_KEY, reduceMotion ? 'true' : 'false');
  }, [reduceMotion]);

  const transitionInFlightRef = useRef(false);
  const queuedThemeRef = useRef<ThemeId | null>(null);

  const runTransitionRef = useRef<(from: ThemeId, to: ThemeId) => Promise<void>>(
    async (from, to) => {
      void from;
      internalSetTheme(to);
      themeRef.current = to;
    },
  );

  useEffect(() => {
    runTransitionRef.current = async (from, to) => {
      if (!stageControl) {
        internalSetTheme(to);
        themeRef.current = to;
        return;
      }

      transitionInFlightRef.current = true;
      const { ready, finished } = stageControl.begin({ from, to });
      await ready;
      internalSetTheme(to);
      themeRef.current = to;
      await finished;
      transitionInFlightRef.current = false;

      const queued = queuedThemeRef.current;
      if (queued && queued !== to) {
        queuedThemeRef.current = null;
        await runTransitionRef.current?.(to, queued);
      }
    };
  }, [stageControl]);

  const setTheme = useCallback(
    (next: ThemeId) => {
      const target = KNOWN_THEMES.includes(next) ? next : FALLBACK_THEME;
      if (target === themeRef.current) {
        return;
      }

      if (reduceMotion) {
        internalSetTheme(target);
        themeRef.current = target;
        return;
      }

      if (transitionInFlightRef.current) {
        queuedThemeRef.current = target;
        return;
      }

      runTransitionRef.current?.(themeRef.current, target);
    },
    [reduceMotion],
  );

  const setReduceMotion = useCallback((next: boolean) => {
    internalSetReduceMotion(Boolean(next));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      reduceMotion,
      setReduceMotion,
    }),
    [theme, setTheme, reduceMotion, setReduceMotion],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeController(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeController must be used within a ThemeProvider');
  }
  return ctx;
}
