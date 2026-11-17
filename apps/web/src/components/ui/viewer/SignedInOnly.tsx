'use client';

import type { CSSProperties, ReactNode } from 'react';

import cn from '@/lib/cn';
import { useIsSignedIn } from '@/lib/marking/hooks';

import { VIEWER_REVEAL_CLASS } from './reveal';

type Display = 'block' | 'flex' | 'inline-flex';

const DISPLAY: Readonly<Record<Display, string>> = {
  block: 'block',
  flex: 'flex',
  'inline-flex': 'inline-flex',
};

/**
 * Space or marks that exist only for a signed-in viewer, with no shift either
 * way. The cached shell can't know the viewer: on a hard load the root
 * pre-paint script shows it from the display cookie; on a client navigation
 * the cookie is read at once; signed out it is never drawn.
 *
 * @example
 * <SignedInOnly className="h-6" /> // a placeholder for a streamed line
 */
export default function SignedInOnly({
  children,
  className,
  display = 'block',
  placeholder,
}: Readonly<{
  children?: ReactNode;
  className?: string;
  display?: Display;
  /** `data-placeholder` for the placeholder-parity e2e checks. */
  placeholder?: string;
}>) {
  const signedIn = useIsSignedIn();
  if (signedIn === false) {
    return null;
  }
  if (signedIn) {
    const shown = cn(DISPLAY[display], className);
    return (
      <span className={shown} data-placeholder={placeholder}>
        {children}
      </span>
    );
  }
  const style = {
    '--viewer-display': display,
    display: 'none',
  } as CSSProperties;
  const revealed = cn(className, VIEWER_REVEAL_CLASS);
  return (
    <span className={revealed} data-placeholder={placeholder} style={style}>
      {children}
    </span>
  );
}
