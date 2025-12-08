import { render, screen } from '@testing-library/react';

import { TerminalOutputLog } from '@/components/terminal/terminal-output-log';

describe('TerminalOutputLog', () => {
  it('renders output lines and typing line', () => {
    render(
      <TerminalOutputLog
        output={[
          { id: '1', text: 'HELLO', kind: 'system' },
          { id: '2', text: 'WORLD', kind: 'muted' },
        ]}
        typingLine={{ id: 'typing', kind: 'output', visibleText: 'TYPE' }}
      />,
    );

    expect(screen.getByText('HELLO')).toBeInTheDocument();
    expect(screen.getByText('WORLD')).toBeInTheDocument();
    expect(screen.getByText('TYPE')).toBeInTheDocument();
  });
});
