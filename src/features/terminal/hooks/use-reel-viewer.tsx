'use client';

import Image from 'next/image';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ReelItem } from '@/lib/terminal/commands/reel';
import { useThemeController } from '@/lib/theme/theme-provider';

type ReelViewerState = {
  isOpen: boolean;
  items: ReelItem[];
  activeIndex: number;
};

type ReelViewerContextValue = {
  state: ReelViewerState;
  open: (items: ReelItem[]) => void;
  close: () => void;
  goNext: () => void;
  goPrev: () => void;
  select: (index: number) => void;
};

const ReelViewerContext = createContext<ReelViewerContextValue | null>(null);

export function ReelViewerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ReelViewerState>({
    isOpen: false,
    items: [],
    activeIndex: 0,
  });
  const { reduceMotion } = useThemeController();
  const keyHandlerRef = useRef<((event: KeyboardEvent) => void) | null>(null);

  const open = useCallback((items: ReelItem[]) => {
    if (!items.length) {
      return;
    }
    setState({ isOpen: true, items, activeIndex: 0 });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const goNext = useCallback(() => {
    setState((prev) => {
      if (!prev.items.length) {
        return prev;
      }
      return {
        ...prev,
        activeIndex: (prev.activeIndex + 1) % prev.items.length,
      };
    });
  }, []);

  const goPrev = useCallback(() => {
    setState((prev) => {
      if (!prev.items.length) {
        return prev;
      }
      return {
        ...prev,
        activeIndex: (prev.activeIndex - 1 + prev.items.length) % prev.items.length,
      };
    });
  }, []);

  const select = useCallback((index: number) => {
    setState((prev) => {
      if (!prev.items.length) {
        return prev;
      }
      const nextIndex = Math.max(0, Math.min(index, prev.items.length - 1));
      return { ...prev, activeIndex: nextIndex };
    });
  }, []);

  useEffect(() => {
    keyHandlerRef.current = (event: KeyboardEvent) => {
      if (!state.isOpen) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
    };
  }, [state.isOpen, close, goNext, goPrev]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => keyHandlerRef.current?.(event);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const value = useMemo<ReelViewerContextValue>(
    () => ({
      state,
      open,
      close,
      goNext,
      goPrev,
      select,
    }),
    [state, open, close, goNext, goPrev, select],
  );

  return (
    <ReelViewerContext.Provider value={value}>
      {children}
      {state.isOpen ? (
        <div className="reel-viewer" data-reduce-motion={reduceMotion ? 'true' : 'false'}>
          <button className="reel-viewer__close" onClick={close} aria-label="Close reel">
            ×
          </button>
          <div className="reel-viewer__main">
            {state.items[state.activeIndex] ? (
              <Image
                src={state.items[state.activeIndex]!.url}
                alt={state.items[state.activeIndex]!.caption ?? 'Reel image'}
                width={900}
                height={600}
                className="reel-viewer__image"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 900px"
              />
            ) : null}
            {state.items[state.activeIndex]?.caption ? (
              <p className="reel-viewer__caption">{state.items[state.activeIndex]?.caption}</p>
            ) : null}
          </div>
          <div className="reel-viewer__grid">
            {state.items.map((item, index) => (
              <button
                key={item.id}
                className="reel-thumb"
                aria-label={item.caption ?? `Reel image ${index + 1}`}
                data-active={index === state.activeIndex ? 'true' : 'false'}
                onClick={() => select(index)}
              >
                <Image
                  src={item.url}
                  alt={item.caption ?? ''}
                  width={160}
                  height={120}
                  sizes="160px"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </ReelViewerContext.Provider>
  );
}

export function useReelViewer() {
  const ctx = useContext(ReelViewerContext);
  if (!ctx) {
    throw new Error('useReelViewer must be used within ReelViewerProvider');
  }
  return ctx;
}
