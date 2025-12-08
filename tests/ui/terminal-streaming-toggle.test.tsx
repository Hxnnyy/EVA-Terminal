import { act, render } from '@testing-library/react';
import { createRef, useEffect } from 'react';
import { vi } from 'vitest';

import {
  type TerminalSessionState,
  useTerminalSession,
} from '@/features/terminal/lib/use-terminal-session';

const enqueue = vi.fn();
const skip = vi.fn();
const fastForward = vi.fn();
const clear = vi.fn();

vi.mock('@/lib/terminal/use-typewriter', () => ({
  useTypewriter: () => ({
    lines: [],
    typingLine: { id: 'typing', kind: 'output', visibleText: '' },
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
    setTheme: vi.fn(),
    reduceMotion: false,
    setReduceMotion: vi.fn(),
  }),
}));

vi.mock('@/features/terminal/hooks/use-reel-viewer', () => ({
  useReelViewer: () => ({ open: vi.fn() }),
}));

vi.mock('@/features/terminal/hooks/use-onepager', () => ({
  useOnepager: () => ({ state: { isOpen: false }, open: vi.fn(), close: vi.fn() }),
}));

vi.mock('@/features/admin/components/use-admin-auth', () => ({
  useAdminAuth: () => ({
    isModalOpen: false,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    signIn: vi.fn(),
    status: 'idle',
    error: null,
  }),
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

describe('useTerminalSession streaming toggle', () => {
  beforeEach(() => {
    enqueue.mockClear();
    skip.mockClear();
    fastForward.mockClear();
    clear.mockClear();
  });

  it('turns streaming off and fast-forwards', () => {
    const ref = renderSession();
    act(() => {
      ref.current?.submit('/streaming off');
    });

    expect(ref.current?.streamingEnabled).toBe(false);
    expect(fastForward).toHaveBeenCalled();
  });

  it('re-enables streaming', () => {
    const ref = renderSession();
    act(() => {
      ref.current?.submit('/streaming off');
      ref.current?.submit('/streaming on');
    });

    expect(ref.current?.streamingEnabled).toBe(true);
  });
});
