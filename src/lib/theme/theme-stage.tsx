'use client';

import clsx from 'clsx';
import html2canvas from 'html2canvas';
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

import { useCspNonce } from '@/lib/csp/nonce-context';
import { createLogger } from '@/lib/logger';
import type { ThemeId } from '@/lib/theme/theme-manifest';

const GRID_COLUMNS = 12;
const GRID_ROWS = 6;
const ROW_DELAY_WEIGHT = 0.55;
const CELL_DELAY_STEP = 12;
const CELL_DURATION_BASE = 220;
const CELL_DURATION_VARIATION = 140;
const RIPPLE_BASE_DURATION = 360;

const formatDeg = (value: number) => `${value.toFixed(2)}deg`;
const formatPx = (value: number) => `${value.toFixed(2)}px`;

type ThemeStageControl = {
  begin: (args: { from: ThemeId; to: ThemeId }) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

type TransformFrame = {
  rx: string;
  ry: string;
  tx: string;
  ty: string;
  tz: string;
};

type GeometryCell = {
  key: string;
  width: number;
  height: number;
  left: number;
  top: number;
  delay: number;
  tilt: number;
  wave: number;
  duration: number;
  transform: {
    start: TransformFrame;
    crest: TransformFrame;
    settle: TransformFrame;
  };
};

type Geometry = {
  cells: GeometryCell[];
  duration: number;
  contentWidth: number;
  contentHeight: number;
  originLeft: number;
  originTop: number;
};

type CloneState = {
  key: number;
  from: ThemeId;
  snapshot: string | null;
  geometry: Geometry;
};

type ThemeStageProviderProps = PropsWithChildren;

const ThemeStageControlContext = createContext<ThemeStageControl | null>(null);
const themeLogger = createLogger({ scope: 'theme-stage' });

export function useThemeStageControl(): ThemeStageControl {
  const ctx = useContext(ThemeStageControlContext);
  if (!ctx) {
    throw new Error('useThemeStageControl must be used within a ThemeStageProvider');
  }
  return ctx;
}

export function ThemeStageProvider({ children }: ThemeStageProviderProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const finishResolverRef = useRef<(() => void) | null>(null);
  const geometryRef = useRef<Geometry | null>(null);
  const snapshotRef = useRef<string | null>(null);
  const capturePromiseRef = useRef<Promise<string | null> | null>(null);
  const scheduleCaptureRef = useRef<number | null>(null);

  const [cloneState, setCloneState] = useState<CloneState | null>(null);

  const computeGeometry = useCallback((rect: DOMRect): Geometry => {
    const originLeft = Math.round(rect.left);
    const originTop = Math.round(rect.top);
    const width = Math.max(0, Math.ceil(rect.width));
    const height = Math.max(0, Math.ceil(rect.height));
    const cellWidth = width > 0 ? Math.ceil(width / GRID_COLUMNS) : 0;
    const cellHeight = height > 0 ? Math.ceil(height / GRID_ROWS) : 0;
    const maxDistance = GRID_COLUMNS - 1 + (GRID_ROWS - 1) * ROW_DELAY_WEIGHT;
    const cells: GeometryCell[] = [];

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLUMNS; col += 1) {
        const left = originLeft + col * cellWidth;
        const top = originTop + row * cellHeight;
        const widthCell = Math.min(cellWidth, originLeft + width - left);
        const heightCell = Math.min(cellHeight, originTop + height - top);
        const distance = col + row * ROW_DELAY_WEIGHT;
        const delay = distance * CELL_DELAY_STEP;
        const normalized = maxDistance > 0 ? distance / maxDistance : 0;
        const wave = normalized;
        const tilt = 18 + normalized * 28 + (col % 2 === 0 ? 4 : -4);
        const cellDuration = CELL_DURATION_BASE + normalized * CELL_DURATION_VARIATION;
        const startFrame: TransformFrame = {
          rx: formatDeg(tilt * 0.08),
          ry: formatDeg(tilt * -0.08),
          tx: formatPx(wave * -8),
          ty: formatPx(wave * -6),
          tz: formatPx(0),
        };
        const crestFrame: TransformFrame = {
          rx: formatDeg(tilt * 0.85),
          ry: formatDeg(tilt * -0.55),
          tx: formatPx(wave * 10),
          ty: formatPx(wave * -16),
          tz: formatPx(wave * -14),
        };
        const settleFrame: TransformFrame = {
          rx: formatDeg(tilt * 1.18),
          ry: formatDeg(tilt * -0.38),
          tx: formatPx(8),
          ty: formatPx(-12),
          tz: formatPx(-18),
        };
        cells.push({
          key: `${row}-${col}`,
          width: widthCell,
          height: heightCell,
          left,
          top,
          delay,
          tilt,
          wave: normalized,
          duration: cellDuration,
          transform: {
            start: startFrame,
            crest: crestFrame,
            settle: settleFrame,
          },
        });
      }
    }

    const duration = RIPPLE_BASE_DURATION + maxDistance * CELL_DELAY_STEP + 220;

    return {
      cells,
      duration,
      contentWidth: width,
      contentHeight: height,
      originLeft,
      originTop,
    };
  }, []);

  const updateGeometry = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) {
      return null;
    }
    const rect = stage.getBoundingClientRect();
    const geometry = computeGeometry(rect);
    geometryRef.current = geometry;
    return geometry;
  }, [computeGeometry]);

  const ensureSnapshot = useCallback((): Promise<string | null> => {
    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }

    if (capturePromiseRef.current) {
      return capturePromiseRef.current;
    }

    const stage = stageRef.current;
    if (!stage) {
      return Promise.resolve(null);
    }

    const rect = stage.getBoundingClientRect();
    const geometry = computeGeometry(rect);
    geometryRef.current = geometry;

    const width = Math.max(1, Math.ceil(rect.width));
    const height = Math.max(1, Math.ceil(rect.height));

    const promise = html2canvas(stage, {
      backgroundColor: null,
      scale: Math.min(window.devicePixelRatio || 1, 1.5),
      width,
      height,
      logging: false,
      useCORS: true,
    })
      .then((canvas) => {
        snapshotRef.current = canvas.toDataURL('image/png');
        return snapshotRef.current;
      })
      .catch((error) => {
        themeLogger.warn('Theme stage snapshot failed', error);
        return null;
      })
      .finally(() => {
        capturePromiseRef.current = null;
      });

    capturePromiseRef.current = promise;
    return promise;
  }, [computeGeometry]);

  const scheduleSnapshot = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (scheduleCaptureRef.current) {
      window.clearTimeout(scheduleCaptureRef.current);
    }
    scheduleCaptureRef.current = window.setTimeout(() => {
      scheduleCaptureRef.current = null;
      void ensureSnapshot();
    }, 80);
  }, [ensureSnapshot]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    updateGeometry();

    // Wait for boot sequence to complete before capturing snapshot
    // The boot overlay adds 'boot-hidden' class to body; we wait for its removal
    const captureWhenReady = () => {
      let cancelled = false;
      let frameId: number | null = null;

      frameId = window.requestAnimationFrame(() => {
        frameId = window.requestAnimationFrame(() => {
          if (!cancelled) {
            void ensureSnapshot();
          }
        });
      });

      return () => {
        cancelled = true;
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
      };
    };

    // If boot-hidden class is not present, boot is already done or skipped
    if (!document.body.classList.contains('boot-hidden')) {
      return captureWhenReady();
    }

    // Wait for boot to complete (boot-hidden class to be removed)
    let cleanup: (() => void) | null = null;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class' &&
          !document.body.classList.contains('boot-hidden')
        ) {
          observer.disconnect();
          cleanup = captureWhenReady();
          break;
        }
      }
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      cleanup?.();
    };
  }, [ensureSnapshot, updateGeometry]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateGeometry();
      scheduleSnapshot();
    });

    observer.observe(stage);

    return () => {
      observer.disconnect();
    };
  }, [scheduleSnapshot, updateGeometry]);

  useEffect(() => {
    return () => {
      if (scheduleCaptureRef.current) {
        window.clearTimeout(scheduleCaptureRef.current);
      }
    };
  }, []);

  const handleRippleComplete = useCallback(() => {
    finishResolverRef.current?.();
    finishResolverRef.current = null;
    setCloneState(null);

    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        scheduleSnapshot();
      }, 80);
    }
  }, [scheduleSnapshot]);

  const begin = useCallback(
    ({ from }: { from: ThemeId; to: ThemeId }) => {
      let resolveReady: () => void = () => {};
      const ready = new Promise<void>((resolve) => {
        resolveReady = resolve;
      });

      const geometry = geometryRef.current ?? updateGeometry();

      if (!geometry) {
        resolveReady();
        finishResolverRef.current = null;
        return { ready, finished: Promise.resolve() };
      }

      setCloneState({
        key: Date.now(),
        from,
        snapshot: snapshotRef.current,
        geometry,
      });

      resolveReady();

      const finished = new Promise<void>((resolve) => {
        finishResolverRef.current = resolve;
      });

      return { ready, finished };
    },
    [updateGeometry],
  );

  useEffect(() => {
    if (!cloneState || typeof window === 'undefined') {
      return;
    }

    const timeout = window.setTimeout(() => {
      handleRippleComplete();
    }, cloneState.geometry.duration + 120);

    return () => window.clearTimeout(timeout);
  }, [cloneState, handleRippleComplete]);

  const control = useMemo<ThemeStageControl>(() => ({ begin }), [begin]);

  return (
    <ThemeStageControlContext.Provider value={control}>
      <div className="theme-stage-current" ref={stageRef}>
        {children}
      </div>
      {cloneState ? (
        <ThemeStageRipple
          key={cloneState.key}
          state={cloneState}
          onComplete={handleRippleComplete}
        />
      ) : null}
    </ThemeStageControlContext.Provider>
  );
}

type RippleProps = {
  state: CloneState;
  onComplete: () => void;
};

function ThemeStageRipple({ state, onComplete }: RippleProps) {
  const nonce = useCspNonce();
  const rippleId = useMemo(() => `theme-stage-ripple-${state.key}`, [state.key]);
  const completedRef = useRef(false);

  const handleEnd = useCallback(() => {
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    completedRef.current = false;

    if (typeof window === 'undefined') {
      return;
    }

    const debugEnabled = Boolean(
      (window as typeof window & { __EVA_THEME_DEBUG?: boolean }).__EVA_THEME_DEBUG,
    );
    if (debugEnabled) {
      const firstCell = document.querySelector<HTMLElement>('.theme-stage-ripple__cell');
      if (firstCell) {
        const computed = window.getComputedStyle(firstCell);
        themeLogger.debug('[theme-stage] cell animation snapshot', {
          animationName: computed.animationName,
          animationDuration: computed.animationDuration,
          delay: computed.animationDelay,
          rxStart: computed.getPropertyValue('--rx-start'),
          ryStart: computed.getPropertyValue('--ry-start'),
          txStart: computed.getPropertyValue('--tx-start'),
        });
      } else {
        themeLogger.debug('[theme-stage] no ripple cell found for snapshot');
      }
    }

    document
      .querySelector('.theme-stage-ripple')
      ?.classList.toggle('theme-stage-debug', debugEnabled);
  }, [state.key]);

  const cellStyles = useMemo(() => {
    const { contentWidth, contentHeight, originLeft, originTop } = state.geometry;
    const rules = state.geometry.cells.map((cell) => {
      const cellContentPositionX = originLeft - cell.left;
      const cellContentPositionY = originTop - cell.top;
      const backgroundImage = state.snapshot ? `background-image:url(\"${state.snapshot}\");` : '';
      const backgroundColor = state.snapshot ? '' : 'background-color: var(--surface-base);';

      return `
#${rippleId} .theme-stage-ripple__cell[data-key="${cell.key}"]{
  width:${cell.width}px;
  height:${cell.height}px;
  left:${cell.left}px;
  top:${cell.top}px;
  --delay:${cell.delay}ms;
  --cell-duration:${cell.duration}ms;
  --rx-start:${cell.transform.start.rx};
  --ry-start:${cell.transform.start.ry};
  --tx-start:${cell.transform.start.tx};
  --ty-start:${cell.transform.start.ty};
  --tz-start:${cell.transform.start.tz};
  --rx-crest:${cell.transform.crest.rx};
  --ry-crest:${cell.transform.crest.ry};
  --tx-crest:${cell.transform.crest.tx};
  --ty-crest:${cell.transform.crest.ty};
  --tz-crest:${cell.transform.crest.tz};
  --rx-settle:${cell.transform.settle.rx};
  --ry-settle:${cell.transform.settle.ry};
  --tx-settle:${cell.transform.settle.tx};
  --ty-settle:${cell.transform.settle.ty};
  --tz-settle:${cell.transform.settle.tz};
}
#${rippleId} .theme-stage-ripple__cell[data-key="${cell.key}"] .theme-stage-ripple__cell-content{
  width:${contentWidth}px;
  height:${contentHeight}px;
  background-size:${contentWidth}px ${contentHeight}px;
  background-position:${cellContentPositionX}px ${cellContentPositionY}px;
  ${backgroundImage}${backgroundColor}
}
`;
    });

    return rules.join('');
  }, [rippleId, state.geometry, state.snapshot]);

  return (
    <div
      id={rippleId}
      className={clsx('theme-stage-ripple', `theme-${state.from}`)}
      data-has-snapshot={state.snapshot ? 'true' : 'false'}
    >
      {/* SECURITY: Safe usage — CSS generated from computed geometry values.
          Content is numeric/derived from DOMRect measurements, not user-provided.
          Nonce protects from injection. */}
      <style nonce={nonce ?? undefined} dangerouslySetInnerHTML={{ __html: cellStyles }} />
      {state.geometry.cells.map((cell, index) => (
        <div
          key={cell.key}
          className="theme-stage-ripple__cell"
          data-key={cell.key}
          onAnimationEnd={index === state.geometry.cells.length - 1 ? handleEnd : undefined}
        >
          <div className="theme-stage-ripple__cell-content" />
        </div>
      ))}
    </div>
  );
}
