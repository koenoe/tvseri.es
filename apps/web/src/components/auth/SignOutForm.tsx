'use client';

import type { FormEvent, ReactNode } from 'react';

function hidePage(_event: FormEvent<HTMLFormElement>) {
  // The browser keeps the old page painted until the next one paints; a
  // private page must not stay readable while that loads (globals.css).
  const root = document.documentElement;
  root.setAttribute('data-signing-out', '');
  // Back from the next page may restore this one from the bfcache
  window.addEventListener(
    'pageshow',
    () => root.removeAttribute('data-signing-out'),
    { once: true },
  );
}

/**
 * The one Sign out: a plain form post to the logout route (works without
 * JS), which hides the page as it submits.
 */
export default function SignOutForm({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <form
      action="/api/auth/logout"
      className={className}
      method="post"
      onSubmit={hidePage}
    >
      {children}
    </form>
  );
}
