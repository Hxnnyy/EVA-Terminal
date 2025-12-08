import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { TerminalShellClient } from '@/features/terminal/components/terminal-shell-client';
import type { TypewriterControls } from '@/lib/terminal/use-typewriter';

const enqueue = vi.fn();
const skip = vi.fn();
const fastForward = vi.fn();
const clear = vi.fn();

const typewriterMock: TypewriterControls = {
  lines: [],
  typingLine: null,
  enqueue,
  skip,
  fastForward,
  clear,
  isTyping: false,
};

vi.mock('@/lib/terminal/use-typewriter', () => ({
  useTypewriter: () => typewriterMock,
}));

vi.mock('@/lib/theme/theme-provider', () => ({
  useThemeController: () => ({
    theme: 'eoe',
    setTheme: vi.fn(),
    reduceMotion: true,
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

describe('Terminal reduced-motion', () => {
  it('hides boot overlay when prefers-reduced-motion', () => {
    const createMatchMedia = (matches: boolean): MediaQueryList => ({
      matches,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    });

    window.matchMedia = vi.fn().mockImplementation(() => createMatchMedia(true));
    render(<TerminalShellClient />);
    expect(screen.queryByLabelText(/boot sequence/i)).not.toBeInTheDocument();
  });
});
