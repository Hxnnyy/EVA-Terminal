'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type TerminalLineKind =
  | 'system'
  | 'user'
  | 'output'
  | 'error'
  | 'muted'
  | 'accent'
  | 'gain'
  | 'loss'
  | 'flat';

type TerminalSegment = {
  text: string;
  kind?: TerminalLineKind;
  href?: string;
};

export type TerminalLine = {
  id: string;
  kind: TerminalLineKind;
  text: string;
  segments?: TerminalSegment[];
};

type QueueItem = TerminalLine & {
  speed?: number;
  instant?: boolean;
};

type TypingState = {
  id: string;
  kind: TerminalLineKind;
  fullText: string;
  visibleText: string;
  speed: number;
  segments?: TerminalSegment[];
};

export type TypewriterControls = {
  lines: TerminalLine[];
  typingLine: TypingState | null;
  enqueue: (items: QueueItem[]) => void;
  skip: () => void;
  fastForward: () => void;
  clear: () => void;
  isTyping: boolean;
};

// Typing cadence defaults; tuned to feel brisk without stutter.
const BASE_CPS = 52;
const MAX_STEP = 8;
const MIN_DELAY = 18;
const DEFAULT_DELAY = 1000 / BASE_CPS;
const FAST_MULTIPLIER = 5;

export function useTypewriter(): TypewriterControls {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const queueRef = useRef<QueueItem[]>([]);
  const [queueVersion, setQueueVersion] = useState(0);
  const [typingLine, setTypingLine] = useState<TypingState | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const typingLineRef = useRef<TypingState | null>(null);
  const processedQueueVersionRef = useRef(0);
  const flushedLineRef = useRef<string | null>(null);

  const enqueue = useCallback((items: QueueItem[]) => {
    if (!items.length) {
      return;
    }
    queueRef.current.push(...items);
    setQueueVersion((value) => value + 1);
  }, []);

  const clear = useCallback(() => {
    queueRef.current = [];
    setTypingLine(null);
    typingLineRef.current = null;
    setLines([]);
    setSpeedMultiplier(1);
    setQueueVersion((value) => value + 1);
  }, []);

  const flushTyping = useCallback(
    (typing: TypingState | null) => {
      if (!typing) {
        return;
      }
      setLines((prev) => {
        // Prevent duplicate keys by checking if this ID already exists
        if (prev.some((line) => line.id === typing.id)) {
          return prev;
        }
        return [
          ...prev,
          {
            id: typing.id,
            text: typing.fullText,
            kind: typing.kind,
            segments: typing.segments,
          },
        ];
      });
    },
    [setLines],
  );

  const pumpQueue = useCallback(
    (currentTyping: TypingState | null) => {
      if (currentTyping) {
        return currentTyping;
      }
      while (queueRef.current.length) {
        const next = queueRef.current.shift()!;
        if (next.instant) {
          setLines((prev) => [...prev, next]);
          continue;
        }
        return {
          id: next.id,
          kind: next.kind,
          fullText: next.text,
          visibleText: '',
          speed: next.speed ?? BASE_CPS,
          segments: next.segments,
        };
      }
      return null;
    },
    [setLines],
  );

  useEffect(() => {
    if (queueVersion === processedQueueVersionRef.current) {
      return;
    }
    processedQueueVersionRef.current = queueVersion;

    const nextTyping = pumpQueue(typingLineRef.current);
    typingLineRef.current = nextTyping;
    setTypingLine(nextTyping);
    if (!queueRef.current.length && !typingLineRef.current) {
      setSpeedMultiplier(1);
    }
  }, [queueVersion, pumpQueue]);

  useEffect(() => {
    typingLineRef.current = typingLine;
  }, [typingLine]);

  useEffect(() => {
    if (!typingLine && queueRef.current.length === 0) {
      setSpeedMultiplier(1);
    }
  }, [typingLine]);

  useEffect(() => {
    if (!typingLine) {
      flushedLineRef.current = null;
      return;
    }

    if (typingLine.visibleText.length >= typingLine.fullText.length) {
      if (flushedLineRef.current === typingLine.id) {
        return;
      }
      flushedLineRef.current = typingLine.id;
      flushTyping(typingLine);
      const nextTyping = pumpQueue(null);
      typingLineRef.current = nextTyping;
      setTypingLine(nextTyping);
      return;
    }

    flushedLineRef.current = null;

    const charsPerFrame = Math.min(
      MAX_STEP,
      Math.max(1, Math.round((typingLine.speed * speedMultiplier) / BASE_CPS)),
    );
    const delay = Math.max(
      MIN_DELAY,
      DEFAULT_DELAY / (typingLine.speed / BASE_CPS) / speedMultiplier,
    );

    const timer = window.setTimeout(() => {
      setTypingLine((prev) => {
        if (!prev) {
          return prev;
        }
        const nextVisible = prev.fullText.slice(0, prev.visibleText.length + charsPerFrame);
        return {
          ...prev,
          visibleText: nextVisible,
        };
      });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [typingLine, speedMultiplier, flushTyping, pumpQueue]);

  const skip = useCallback(() => {
    flushTyping(typingLine);
    const remainder = queueRef.current.splice(0);
    if (remainder.length) {
      setLines((prev) => {
        const existingIds = new Set(prev.map((line) => line.id));
        const newLines = remainder
          .filter((item) => !existingIds.has(item.id))
          .map((item) => ({
            id: item.id,
            text: item.text,
            kind: item.kind,
            segments: item.segments,
          }));
        return [...prev, ...newLines];
      });
    }
    setTypingLine(null);
    typingLineRef.current = null;
    setSpeedMultiplier(1);
    setQueueVersion((value) => value + 1);
  }, [flushTyping, typingLine]);

  const fastForward = useCallback(() => {
    if (!typingLine && queueRef.current.length === 0) {
      return;
    }
    setSpeedMultiplier(FAST_MULTIPLIER);
  }, [typingLine]);

  const isTyping = useMemo(() => Boolean(typingLine) || queueRef.current.length > 0, [typingLine]);

  return {
    lines,
    typingLine,
    enqueue,
    skip,
    fastForward,
    clear,
    isTyping,
  };
}
