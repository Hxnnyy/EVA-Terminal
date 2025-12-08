'use client';

import { useEffect, useRef, useState } from 'react';

import { runBootWarmups } from '@/lib/boot/warmup';

import { MAGI_STREAM_LINES } from './boot-lines';

export function useBootSequence(skipBoot = false) {
  const [bootVisible, setBootVisible] = useState(!skipBoot);
  const [bootFading, setBootFading] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [bootReady, setBootReady] = useState(false);
  const [readyText, setReadyText] = useState('');
  const bootWarmupStarted = useRef(false);

  useEffect(() => {
    if (skipBoot) return;

    if (typeof document !== 'undefined') {
      document.body.classList.add('boot-hidden');
    }

    const timers: number[] = [];
    const startDelay = 120;
    const lineInterval = 30;
    const postReadyDelay = 2450;
    const fadeDuration = 1000;
    const readyLine = "MAGI SYSTEM READY. GOD'S IN HIS HEAVEN, ALL'S RIGHT WITH THE WORLD.";
    const readyCharInterval = 16;

    const startStream = () => {
      MAGI_STREAM_LINES.forEach((line, index) => {
        const id = window.setTimeout(
          () => setBootLines((prev) => [...prev, line]),
          index * lineInterval,
        );
        timers.push(id);
      });

      const totalStream = MAGI_STREAM_LINES.length * lineInterval;

      timers.push(
        window.setTimeout(() => {
          setBootReady(true);
          setReadyText('');
          for (let i = 0; i <= readyLine.length; i++) {
            const id = window.setTimeout(
              () => setReadyText(readyLine.slice(0, i)),
              i * readyCharInterval,
            );
            timers.push(id);
          }
        }, totalStream + 120),
      );

      timers.push(window.setTimeout(() => setBootFading(true), totalStream + postReadyDelay));

      timers.push(
        window.setTimeout(
          () => {
            setBootVisible(false);
          },
          totalStream + postReadyDelay + fadeDuration,
        ),
      );
    };

    timers.push(window.setTimeout(() => void startStream(), startDelay));

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [skipBoot]);

  useEffect(() => {
    if (skipBoot) return;
    if (typeof document === 'undefined') return;
    if (!bootVisible) {
      document.body.classList.remove('boot-hidden');
    }
  }, [bootVisible, skipBoot]);

  useEffect(() => {
    if (skipBoot) return;
    if (typeof document === 'undefined') return;
    if (bootFading) {
      document.body.classList.remove('boot-hidden');
    }
  }, [bootFading, skipBoot]);

  // Fire-and-forget warmups during boot; never block overlay/fade.
  useEffect(() => {
    if (bootWarmupStarted.current) return;
    bootWarmupStarted.current = true;

    const startWarmups = () => {
      void runBootWarmups();
    };

    if (typeof window === 'undefined') {
      return;
    }

    if ('requestIdleCallback' in window) {
      const idleId = (
        window as Window &
          typeof window & {
            requestIdleCallback: typeof requestIdleCallback;
            cancelIdleCallback?: typeof cancelIdleCallback;
          }
      ).requestIdleCallback(startWarmups, { timeout: 1200 });

      return () =>
        (
          window as Window &
            typeof window & {
              cancelIdleCallback?: typeof cancelIdleCallback;
            }
        ).cancelIdleCallback?.(idleId);
    }

    const timer = globalThis.setTimeout(startWarmups, 300);
    return () => globalThis.clearTimeout(timer);
  }, []);

  return { bootVisible, bootFading, bootLines, bootReady, readyText };
}
