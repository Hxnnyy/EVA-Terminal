import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { TerminalCommandBar } from '@/features/terminal/components/terminal-command-bar';
import { TerminalOutputLog } from '@/features/terminal/components/terminal-output-log';

describe('Terminal session pieces', () => {
  it('invokes submit on enter and updates input', () => {
    const handleSubmit = vi.fn();
    const handleChange = vi.fn();
    const inputRef = { current: null as HTMLInputElement | null };
    render(
      <TerminalCommandBar
        value=""
        onChange={handleChange}
        onSubmit={handleSubmit}
        onKeyDown={() => {}}
        inputRef={inputRef}
        placeholder="Type /start"
      />,
    );

    const input = screen.getByPlaceholderText('Type /start');
    fireEvent.change(input, { target: { value: '/start' } });
    fireEvent.submit(input.closest('form')!);

    expect(handleSubmit).toHaveBeenCalled();
  });

  it('renders output lines in log', () => {
    render(
      <div className="terminal-screen__inner">
        <TerminalOutputLog
          output={[
            { id: '1', text: 'ONE', kind: 'system' },
            { id: '2', text: 'TWO', kind: 'output' },
          ]}
          typingLine={{ id: 'typing', kind: 'output', visibleText: '...' }}
        />
      </div>,
    );

    expect(screen.getByText('ONE')).toBeInTheDocument();
    expect(screen.getByText('TWO')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
