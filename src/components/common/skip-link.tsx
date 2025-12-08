'use client';

/**
 * Skip link for accessibility.
 * Allows keyboard users to bypass navigation and jump directly to main content.
 * Hidden by default, visible when focused.
 */
export function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to content
    </a>
  );
}
