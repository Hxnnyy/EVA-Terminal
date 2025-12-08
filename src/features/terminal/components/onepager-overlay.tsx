'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useOnepager } from '@/features/terminal/hooks/use-onepager';

type OnepagerOverlayProps = {
  children: React.ReactNode;
};

export function OnepagerOverlay({ children }: OnepagerOverlayProps) {
  const { state, close } = useOnepager();
  const overlayRef = useRef<HTMLDivElement>(null);

  const isMobileForced = state.isMobileForced;

  // Close immediately - terminal is already visible underneath, no animation needed
  // The peel animation only makes sense when opening (peeling away terminal)
  const handleClose = useCallback(() => {
    close();
  }, [close]);

  useEffect(() => {
    if (!state.isOpen) return;
    // Don't allow Escape to close on mobile (would show broken terminal)
    if (isMobileForced) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.isOpen, handleClose, isMobileForced]);

  useEffect(() => {
    if (state.isOpen) overlayRef.current?.focus();
  }, [state.isOpen]);

  if (!state.isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="onepager-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="One-page summary"
      tabIndex={-1}
    >
      <div className="onepager-content">
        <header className="onepager-header">
          {isMobileForced ? (
            <span className="onepager-mobile-notice">
              📱 Mobile View — Full terminal available on desktop
            </span>
          ) : (
            <button type="button" className="onepager-close" onClick={handleClose}>
              ← Return to Terminal
            </button>
          )}
        </header>
        <main className="onepager-body">{children}</main>
      </div>
    </div>
  );
}
