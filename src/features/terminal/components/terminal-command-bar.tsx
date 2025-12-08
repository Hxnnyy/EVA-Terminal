'use client';

import React, { FormEvent, RefObject } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder?: string;
};

export function TerminalCommandBar({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  inputRef,
  placeholder = 'Try /start, /onepager, or /help',
}: Props) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
    inputRef.current?.focus();
  };

  return (
    <form className="terminal-prompt" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="terminal-input">
        Command input
      </label>
      <span className="terminal-symbol" aria-hidden="true">
        &gt;&gt;
      </span>
      <input
        id="terminal-input"
        ref={inputRef}
        className="terminal-input"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
    </form>
  );
}
