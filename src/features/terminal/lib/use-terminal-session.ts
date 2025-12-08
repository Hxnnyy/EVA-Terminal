'use client';

import { useRouter } from 'next/navigation';
import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOnepager } from '@/features/terminal/hooks/use-onepager';
import { useReelViewer } from '@/features/terminal/hooks/use-reel-viewer';
import { createLogger } from '@/lib/logger';
import type { CommandResponse, TerminalCommandRegistry } from '@/lib/terminal/command-registry';
import { MENU_OPTIONS, THEME_COMMANDS } from '@/lib/terminal/constants';
import { TerminalLine, TerminalLineKind, useTypewriter } from '@/lib/terminal/use-typewriter';
import { THEME_LIST, type ThemeId } from '@/lib/theme/theme-manifest';
import { useThemeController } from '@/lib/theme/theme-provider';

type HudItem = {
  label: string;
  value: string;
};

export type TerminalSessionState = {
  output: TerminalLine[];
  typingLine: ReturnType<typeof useTypewriter>['typingLine'];
  input: string;
  setInput: (value: string) => void;
  submit: (value?: string) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  skipTyping: () => void;
  fastForward: () => void;
  clearAll: () => void;
  hud: HudItem[];
  isBusy: boolean;
  streamingEnabled: boolean;
  lastInteraction: string;
};

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const normalizeInput = (value: string) => value.trim().toLowerCase();

const buildMenuLines = () => {
  const rows = MENU_OPTIONS.map((option) => ({
    text: `/${option.id} ${option.label.toUpperCase()}`,
    kind: 'output' as const,
  }));

  if (process.env.NODE_ENV !== 'production') {
    console.debug(
      '[terminal]/start',
      rows.map((line) => line.text),
    );
  }

  return [
    { text: 'EVA TERMINAL :: COMMAND MATRIX', kind: 'system' as const },
    { text: 'Use /1 through /10 to execute a module.', kind: 'muted' as const },
    ...rows,
  ];
};

const buildHelpLines = () => [
  { text: 'RETRIEVING MAGI USAGE GUIDANCE...', kind: 'system' as const },
  {
    text: 'Themes     :: /eoe, /eva01, /eva02, /eva00',
    kind: 'output' as const,
  },
  {
    text: 'Toggle     :: /reduce-motion on|off    /streaming on|off',
    kind: 'output' as const,
  },
  {
    text: 'Overlay    :: /onepager (accessible one-page summary)',
    kind: 'output' as const,
  },
  {
    text: 'Commands   :: s = skip, f = fast-forward',
    kind: 'output' as const,
  },
  {
    text: 'Menu       :: Run /start to recall options',
    kind: 'muted' as const,
  },
];

const MENU_PLACEHOLDERS: Record<number, string> = {};

const BORDER_PATTERN = /^\+[=\-\s]+\+$/;
// Filters boxed ASCII art lines (e.g., tables) so sanitization keeps useful text only.
const BOX_PATTERN = /^\|\s*(.*?)\s*\|$/;

const sanitizeTerminalText = (input: string): string | null => {
  if (typeof input !== 'string') {
    return null;
  }
  const trimmedEnd = input.trimEnd();
  if (!trimmedEnd.trim()) {
    return null;
  }
  if (BORDER_PATTERN.test(trimmedEnd.trim())) {
    return null;
  }
  let normalized = trimmedEnd;
  const boxMatch = normalized.match(BOX_PATTERN);
  if (boxMatch) {
    normalized = boxMatch[1];
  }
  normalized = normalized.replace(/\s+::\s+/g, ': ');
  normalized = normalized.replace(/\s{2,}/g, ' ').trim();
  if (!normalized) {
    return null;
  }
  if (/^tip[:\s]/i.test(normalized)) {
    return null;
  }
  return normalized;
};

const sanitizeSegments = (
  segments?: { text: string; kind?: TerminalLineKind; href?: string }[],
  fallbackKind?: TerminalLineKind,
) => {
  if (!segments?.length) {
    return null;
  }
  const sanitized = segments
    .map((segment) => {
      const text = sanitizeTerminalText(segment.text);
      if (!text) {
        return null;
      }
      const href =
        typeof segment.href === 'string' && /^(https?:\/\/|mailto:|#|\/)/i.test(segment.href.trim())
          ? segment.href.trim()
          : undefined;
      return {
        text,
        kind: segment.kind ?? fallbackKind,
        href,
      };
    })
    .filter(Boolean) as {
    text: string;
    kind?: TerminalLineKind;
    href?: string;
  }[];
  return sanitized.length ? sanitized : null;
};

const THEME_LABEL: Record<ThemeId, string> = THEME_LIST.reduce(
  (acc, theme) => {
    acc[theme.id] = theme.label;
    return acc;
  },
  {} as Record<ThemeId, string>,
);

export function useTerminalSession(): TerminalSessionState {
  const { lines, typingLine, enqueue, skip, fastForward, clear, isTyping } = useTypewriter();
  const { theme, setTheme, reduceMotion, setReduceMotion } = useThemeController();
  const { open: openOnepager } = useOnepager();
  const reelViewer = useReelViewer();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const historyCursorRef = useRef<number | null>(null);
  const [lastInteraction, setLastInteraction] = useState<string>('Boot sequence');
  const bootMessageShownRef = useRef(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [commandRegistry, setCommandRegistry] = useState<TerminalCommandRegistry | null>(null);
  const registryInitRef = useRef(false);
  const registryLogger = useMemo(() => createLogger({ scope: 'terminal:registry' }), []);

  const appendResponse = useCallback(
    (response: CommandResponse) => {
      const normalizedLines = response.lines
        .map((line) => {
          const segments = sanitizeSegments(line.segments, line.kind);
          const text = sanitizeTerminalText(line.text);
          const fallbackText = text ?? segments?.map((segment) => segment.text).join('') ?? null;
          if (!fallbackText && !segments?.length) {
            return null;
          }
          return {
            id: createId(),
            text: fallbackText ?? '',
            kind: line.kind ?? 'output',
            instant: line.instant ?? !streamingEnabled,
            segments: segments ?? undefined,
          };
        })
        .filter(Boolean) as TerminalLine[];
      if (!normalizedLines.length) {
        return;
      }
      enqueue(normalizedLines);
      response.sideEffect?.();
    },
    [enqueue, streamingEnabled],
  );

  useEffect(() => {
    if (registryInitRef.current) return;
    registryInitRef.current = true;
    void import('@/lib/terminal/command-registry')
      .then(({ createTerminalCommandRegistry }) => {
        setCommandRegistry(
          createTerminalCommandRegistry({
            appendResponse,
            setLastInteraction,
            reelViewer,
            flushTyping: skip,
          }),
        );
      })
      .catch((error) => {
        registryLogger.error('Failed to initialize terminal command registry', error);
        appendResponse({
          lines: [
            { text: 'Terminal command modules failed to load.', kind: 'error' },
            { text: 'Refresh the page or retry /start after a moment.', kind: 'muted' },
          ],
        });
        setLastInteraction('Command modules unavailable');
      });
  }, [appendResponse, reelViewer, registryLogger, setLastInteraction, skip]);

  const runCommand = useCallback(
    async (rawInput: string) => {
      const normalized = normalizeInput(rawInput);
      if (!normalized) {
        return;
      }

      if (normalized === 's') {
        skip();
        setLastInteraction('Skipped typing');
        return;
      }

      if (normalized === 'f') {
        fastForward();
        setLastInteraction('Fast-forward typing');
        return;
      }

      if (normalized.startsWith('/streaming')) {
        const parts = normalized.split(/\s+/);
        const value = parts[1];
        if (value === 'on') {
          setStreamingEnabled(true);
          setLastInteraction('Streaming enabled');
        } else if (value === 'off') {
          setStreamingEnabled(false);
          fastForward();
          setLastInteraction('Streaming disabled');
        } else {
          appendResponse({
            lines: [{ text: 'Streaming toggle expects: /streaming on|off', kind: 'error' }],
          });
          setLastInteraction('Streaming syntax error');
        }
        return;
      }

      if (normalized in THEME_COMMANDS) {
        const nextTheme = THEME_COMMANDS[normalized];
        appendResponse({
          lines: [
            {
              text: `Theme change requested → ${THEME_LABEL[nextTheme]}`,
              kind: 'system',
            },
          ],
          sideEffect: () => setTheme(nextTheme),
        });
        setLastInteraction(`Theme set to ${THEME_LABEL[nextTheme]}`);
        return;
      }

      if (normalized.startsWith('/reduce-motion')) {
        const toggle = normalized.split(' ')[1];
        if (toggle === 'on' || toggle === 'off') {
          const nextValue = toggle === 'on';
          appendResponse({
            lines: [
              {
                text: `Reduced motion ${nextValue ? 'enabled' : 'disabled'}.`,
                kind: 'system',
              },
            ],
            sideEffect: () => setReduceMotion(nextValue),
          });
          setLastInteraction(`Reduced motion ${nextValue ? 'on' : 'off'}`);
        } else {
          appendResponse({
            lines: [
              {
                text: 'Usage: /reduce-motion on|off',
                kind: 'error',
              },
            ],
          });
          setLastInteraction('Reduce-motion syntax error');
        }
        return;
      }

      if (normalized === '/start') {
        appendResponse({
          lines: buildMenuLines(),
        });
        setLastInteraction('Menu rendered');
        return;
      }

      if (normalized === '/help') {
        appendResponse({
          lines: buildHelpLines(),
        });
        setLastInteraction('Help printed');
        return;
      }

      if (normalized === '/adminlogin') {
        appendResponse({
          lines: [
            {
              text: 'Opening admin console...',
              kind: 'muted',
            },
            {
              text: 'Redirecting to /admin for authentication.',
              kind: 'muted',
            },
          ],
          sideEffect: () => {
            router.push('/admin?login=1');
          },
        });
        setLastInteraction('Admin console redirect');
        return;
      }

      if (normalized === '/onepager') {
        appendResponse({
          lines: [
            {
              text: 'Opening one-pager view...',
              kind: 'system',
            },
          ],
          sideEffect: () => {
            openOnepager();
          },
        });
        setLastInteraction('One-pager opened');
        return;
      }

      const commandMatch = normalized.match(/^\/(10|[1-9])$/);
      if (commandMatch) {
        const option = Number(commandMatch[1]);
        if (!commandRegistry) {
          appendResponse({
            lines: [{ text: 'Initializing terminal modules...', kind: 'muted', instant: true }],
          });
          setLastInteraction('Initializing modules');
          return;
        }
        const handler = commandRegistry[option];
        if (handler) {
          await handler();
          return;
        }
        appendResponse({
          lines: [
            {
              text:
                MENU_PLACEHOLDERS[option] ??
                'Module placeholder – wiring coming in later milestones.',
              kind: 'muted',
            },
          ],
        });
        setLastInteraction(`Menu option ${option} requested`);
        return;
      }

      appendResponse({
        lines: [
          {
            text: `Command not recognized: ${rawInput}`,
            kind: 'error',
          },
          {
            text: 'Type /help to review available commands.',
            kind: 'muted',
          },
        ],
      });
      setLastInteraction('Unknown command');
    },
    [
      appendResponse,
      commandRegistry,
      fastForward,
      openOnepager,
      router,
      setReduceMotion,
      setTheme,
      skip,
    ],
  );

  const submit = useCallback(
    (override?: string) => {
      const value = override ?? input;
      if (!value.trim()) {
        return;
      }

      setHistory((prev) => [...prev, value]);
      historyCursorRef.current = null;
      enqueue([
        {
          id: createId(),
          text: `> ${value}`,
          kind: 'user',
          instant: true,
        },
      ]);
      void runCommand(value);
      setInput('');
    },
    [enqueue, input, runCommand],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!history.length) {
          return;
        }
        const current = historyCursorRef.current;
        const nextIndex = current === null ? history.length - 1 : Math.max(current - 1, 0);
        const nextValue = history[nextIndex];
        if (nextValue !== undefined) {
          setInput(nextValue);
          historyCursorRef.current = nextIndex;
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const current = historyCursorRef.current;
        if (current === null) {
          setInput('');
          return;
        }
        if (current >= history.length - 1) {
          setInput('');
          historyCursorRef.current = null;
          return;
        }
        const nextIndex = current + 1;
        setInput(history[nextIndex] ?? '');
        historyCursorRef.current = nextIndex;
      }
    },
    [history, submit],
  );

  const hud = useMemo<HudItem[]>(
    () => [
      { label: 'Theme', value: THEME_LABEL[theme] },
      { label: 'Motion', value: reduceMotion ? 'Reduced' : 'Full' },
      { label: 'Typewriter', value: isTyping ? 'Active' : 'Idle' },
      { label: 'Last', value: lastInteraction },
    ],
    [isTyping, lastInteraction, reduceMotion, theme],
  );

  useEffect(() => {
    if (bootMessageShownRef.current) {
      return;
    }
    bootMessageShownRef.current = true;
    appendResponse({
      lines: [
        {
          text: "GOD'S IN HIS HEAVEN, ALL'S RIGHT WITH THE WORLD.",
          kind: 'accent',
        },
        {
          text: 'Type /start to view menu, /onepager for a no-terminal experience, or /help for a list of commands.',
          kind: 'muted',
        },
      ],
    });
    setLastInteraction('Boot sequence');
  }, [appendResponse]);

  return {
    output: lines,
    typingLine,
    input,
    setInput,
    submit,
    handleKeyDown,
    skipTyping: skip,
    fastForward,
    clearAll: clear,
    hud,
    isBusy: isTyping,
    streamingEnabled,
    lastInteraction,
  };
}
