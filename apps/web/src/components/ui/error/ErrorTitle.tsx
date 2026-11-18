'use client';

import { type ReactNode, useCallback } from 'react';

/**
 * The page's h1, focused on mount so a screen reader starts at what went
 * wrong. A ref callback, not an effect.
 *
 * It is wider than the text column (600px against 560px, 370px against
 * 358px): until Inter loads the fallback face draws title text about 6%
 * wider than Inter's Display cut, which would wrap a headline that nearly
 * fills the column onto another line and move the whole bottom-aligned
 * block when the font arrives. The spare room is in the page padding.
 */
export default function ErrorTitle({
  children,
}: Readonly<{ children: ReactNode }>) {
  const focus = useCallback((node: HTMLHeadingElement | null) => {
    node?.focus({ preventScroll: true });
  }, []);
  return (
    <h1
      className="mt-3 text-title-1 text-balance outline-none max-md:w-[calc(100%+12px)] md:w-150"
      ref={focus}
      tabIndex={-1}
    >
      {children}
    </h1>
  );
}
