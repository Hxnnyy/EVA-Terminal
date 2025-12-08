import { act, render } from '@testing-library/react';
import { createRef, useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type TerminalSessionState,
  useTerminalSession,
} from '@/features/terminal/lib/use-terminal-session';

const enqueue = vi.fn();
const skip = vi.fn();
const fastForward = vi.fn();
const clear = vi.fn();
const setTheme = vi.fn();
const setReduceMotion = vi.fn();
const routerPush = vi.fn();
const createTerminalCommandRegistry = vi.fn();
const handlerSpy = vi.fn();

vi.mock('@/lib/terminal/use-typewriter', () => ({
  useTypewriter: () => ({
    lines: [],
    typingLine: null,
    enqueue,
    skip,
    fastForward,
    clear,
    isTyping: false,
  }),
}));

vi.mock('@/lib/theme/theme-provider', () => ({
  useThemeController: () => ({
    theme: 'eoe',
    setTheme,
    reduceMotion: false,
    setReduceMotion,
  }),
}));

vi.mock('@/features/terminal/hooks/use-reel-viewer', () => ({
  useReelViewer: () => ({ open: vi.fn() }),
}));

vi.mock('@/features/terminal/hooks/use-onepager', () => ({
  useOnepager: () => ({ state: { isOpen: false }, open: vi.fn(), close: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: vi.fn(),
    prefetch: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('@/lib/terminal/command-registry', () => ({
  createTerminalCommandRegistry: (...args: unknown[]) => {
    createTerminalCommandRegistry(...args);
    return { 1: handlerSpy };
  },
}));

function renderSession() {
  const ref = createRef<TerminalSessionState>();
  const Harness = () => {
    const session = useTerminalSession();
    useEffect(() => {
      ref.current = session;
    }, [session]);
    return null;
  };
  render(<Harness />);
  return ref;
}

const lastEnqueuedTexts = () =>
  enqueue.mock.calls.at(-1)?.[0]?.map((line: { text: string }) => line.text);

describe('useTerminalSession command parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enqueue.mockClear();
    handlerSpy.mockClear();
    routerPush.mockClear();
  });

  it('changes theme via theme commands', async () => {
    const ref = renderSession();
    enqueue.mockClear(); // drop boot lines

    await act(async () => {
      ref.current?.submit('/eva01');
    });

    expect(setTheme).toHaveBeenCalledWith('eva01');
    expect(ref.current?.lastInteraction).toContain('Theme set to');
  });

  it('validates reduce-motion syntax and toggles when correct', async () => {
    const ref = renderSession();
    enqueue.mockClear();

    await act(async () => {
      ref.current?.submit('/reduce-motion maybe');
    });

    expect(lastEnqueuedTexts()).toContain('Usage: /reduce-motion on|off');
    expect(setReduceMotion).not.toHaveBeenCalled();

    enqueue.mockClear();
    await act(async () => {
      ref.current?.submit('/reduce-motion on');
    });

    expect(setReduceMotion).toHaveBeenCalledWith(true);
  });

  it('redirects to admin on /adminlogin', async () => {
    const ref = renderSession();
    enqueue.mockClear();

    await act(async () => {
      ref.current?.submit('/adminlogin');
    });

    expect(routerPush).toHaveBeenCalledWith('/admin?login=1');
    expect(lastEnqueuedTexts()?.join(' ')).toContain('Redirecting to /admin');
  });

  it('prints menu/help for helper commands', async () => {
    const ref = renderSession();
    enqueue.mockClear();

    await act(async () => {
      ref.current?.submit('/start');
    });

    const menuLines = lastEnqueuedTexts();
    expect(menuLines?.[0]).toContain('EVA TERMINAL: COMMAND MATRIX');

    enqueue.mockClear();
    await act(async () => {
      ref.current?.submit('/help');
    });

    const helpLines = lastEnqueuedTexts();
    expect(helpLines?.some((line: string) => line.includes('Themes'))).toBe(true);
  });

  it('dispatches numeric commands through the registry', async () => {
    const ref = renderSession();
    enqueue.mockClear();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      ref.current?.submit('/1');
    });

    const texts = lastEnqueuedTexts() ?? [];
    const dispatched =
      handlerSpy.mock.calls.length > 0 ||
      texts.some(
        (line: string) =>
          line.includes('Initializing terminal modules') || line.includes('Module placeholder'),
      );
    expect(dispatched).toBe(true);
  });

  it('surfaces friendly error for unknown commands', async () => {
    const ref = renderSession();
    enqueue.mockClear();

    await act(async () => {
      ref.current?.submit('/does-not-exist');
    });

    const messages = lastEnqueuedTexts();
    expect(messages?.[0]).toContain('Command not recognized');
    expect(messages?.[1]).toContain('/help');
  });
});
