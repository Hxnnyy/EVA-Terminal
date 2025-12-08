'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { TerminalBootOverlay } from '@/components/terminal/terminal-boot-overlay';
import { useBootSequence } from '@/components/terminal/use-boot-sequence';
import { usePrefersReducedMotion } from '@/features/terminal/hooks/use-prefers-reduced-motion';
import { useTerminalSession } from '@/features/terminal/lib/use-terminal-session';
import { useThemeController } from '@/lib/theme/theme-provider';

const TerminalOutputLog = dynamic(
  () => import('@/components/terminal/terminal-output-log').then((m) => m.TerminalOutputLog),
  { ssr: false, loading: () => null },
);
const TerminalCommandBar = dynamic(
  () => import('@/components/terminal/terminal-command-bar').then((m) => m.TerminalCommandBar),
  { ssr: false, loading: () => null },
);
const TerminalDecor = dynamic(() => import('./terminal-decor').then((m) => m.TerminalDecor), {
  ssr: false,
  loading: () => null,
});

type RenderableLine = React.ComponentProps<typeof TerminalOutputLog>['output'][number];

const MAGI_UNITS = [
  { id: '01', label: 'MELCHIOR' },
  { id: '02', label: 'BALTHASAR' },
  { id: '03', label: 'CASPER' },
];

const SYSTEM_STATUS = [
  {
    label: 'MATRIX CYCLE',
    value: '09.12.86',
    details: 'MAGI COHERENCE 97.1%',
  },
  {
    label: 'LCL PRESSURE',
    value: 'STABLE',
    details: 'SYNC CHANNEL CALIBRATED',
  },
];

export function TerminalShellClient() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { reduceMotion: themeReduceMotion } = useThemeController();
  const reduceMotion = prefersReducedMotion || themeReduceMotion;
  const [showDecor, setShowDecor] = useState(false);

  const { output, typingLine, input, setInput, submit, handleKeyDown, hud, isBusy } =
    useTerminalSession();
  const boot = useBootSequence(reduceMotion);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Lock body scroll to prevent accidental scrolling on terminal page
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setShowDecor(false);
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const start = () => setShowDecor(true);
    if ('requestIdleCallback' in window) {
      const idleId = (
        window as Window &
          typeof window & {
            requestIdleCallback: typeof requestIdleCallback;
            cancelIdleCallback?: typeof cancelIdleCallback;
          }
      ).requestIdleCallback(start, { timeout: 500 });
      return () =>
        (
          window as Window &
            typeof window & {
              cancelIdleCallback?: typeof cancelIdleCallback;
            }
        ).cancelIdleCallback?.(idleId);
    }
    const timer = globalThis.setTimeout(start, 120);
    return () => globalThis.clearTimeout(timer);
  }, [reduceMotion]);

  const onSubmit = () => {
    submit();
    inputRef.current?.focus();
  };

  const rootClassName = useMemo(
    () =>
      [
        'terminal-root',
        !reduceMotion && boot.bootVisible && !boot.bootFading ? 'terminal-root--booting' : '',
        !reduceMotion && boot.bootFading ? 'terminal-root--fading' : '',
      ]
        .filter(Boolean)
        .join(' '),
    [boot.bootFading, boot.bootVisible, reduceMotion],
  );

  return (
    <section
      className={rootClassName}
      role="main"
      aria-label="EVA terminal console"
      data-reduce-motion={reduceMotion ? 'true' : 'false'}
    >
      <TerminalBootOverlay
        visible={boot.bootVisible}
        fading={boot.bootFading}
        lines={boot.bootLines}
        ready={boot.bootReady}
        readyText={boot.readyText}
        reduceMotion={reduceMotion}
      />

      {showDecor ? <TerminalDecor /> : null}

      <div className="terminal-frame">
        <header className="terminal-header" role="banner" aria-label="MAGI system status">
          <div className="terminal-header__matrix">
            {SYSTEM_STATUS.map((item) => (
              <div className="terminal-header__matrix-item" key={item.label}>
                <span className="terminal-header__matrix-label">{item.label}</span>
                <span className="terminal-header__matrix-value">{item.value}</span>
                <span className="terminal-header__matrix-detail">{item.details}</span>
              </div>
            ))}
          </div>
          <div className="terminal-header__title">
            <span className="terminal-title__label">マギ</span>
            <span className="terminal-title__subtitle">S.C. Magi System</span>
            <span className="terminal-title__cluster">Neural Access Node</span>
          </div>
          <div className="terminal-header__status">
            <span className="terminal-status__led" data-state={isBusy ? 'active' : 'idle'}>
              {isBusy ? 'STREAMING' : 'STANDBY'}
            </span>
            <span className="terminal-status__code">CODE-013 // MAGI-CORE</span>
            <span className="terminal-status__meta">/ eva-terminal v0.1</span>
          </div>
        </header>

        <div className="terminal-body">
          <aside className="terminal-sidebar" aria-hidden="true">
            <div className="terminal-sidebar__meter terminal-sidebar__meter--sync">
              <span>SYNC</span>
              <div className="meter-track">
                <div className="meter-fill" />
              </div>
            </div>
            <div className="terminal-sidebar__meter terminal-sidebar__meter--core">
              <span>CORE</span>
              <div className="meter-track">
                <div className="meter-fill" />
              </div>
            </div>
            <div className="terminal-sidebar__readout">
              <span>MAGI-01</span>
              <span>CHANNEL-01-ALPHA</span>
            </div>
          </aside>

          <div className="terminal-screen" role="region" aria-label="Terminal output and input">
            <div className="terminal-screen__grid" aria-hidden />
            <span className="terminal-mask" aria-hidden />

            <div className="terminal-screen__inner">
              <TerminalOutputLog output={output as RenderableLine[]} typingLine={typingLine} />

              <TerminalCommandBar
                value={input}
                onChange={setInput}
                onSubmit={onSubmit}
                onKeyDown={handleKeyDown}
                inputRef={inputRef}
              />
            </div>
          </div>

          <aside className="terminal-sidebar terminal-sidebar--right" aria-hidden="true">
            <div className="terminal-sidebar__diagram">
              {MAGI_UNITS.map((unit, index) => (
                <div className="terminal-sidebar__diagram-item" key={unit.id}>
                  <span className="terminal-sidebar__diagram-number">{index + 1}</span>
                  <span className="terminal-sidebar__diagram-label">{unit.label}</span>
                </div>
              ))}
            </div>
            <div className="terminal-sidebar__readout">
              <span>MAGI-NET</span>
              <span>NET-STATUS/OK</span>
            </div>
          </aside>
        </div>

        <footer className="terminal-hud" aria-live="off">
          {hud.map((item) => (
            <span key={item.label}>
              <strong>{item.label}:</strong> {item.value}
            </span>
          ))}
        </footer>
      </div>
    </section>
  );
}
