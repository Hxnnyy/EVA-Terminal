'use client';

export function TerminalDecor() {
  return (
    <>
      <div className="terminal-overlay" aria-hidden>
        <div className="terminal-overlay__hex" />
        <div className="terminal-overlay__triad">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="terminal-kanji" aria-hidden>
        <span className="terminal-kanji__label">マギシステム</span>
        <span className="terminal-kanji__code">コードシーケンス</span>
      </div>
    </>
  );
}
