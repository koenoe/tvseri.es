'use client';

import type { MouseEventHandler, ReactNode, SyntheticEvent } from 'react';

import { loginHref } from './menuItems';

// The return path is only known in the browser (the header is cached for
// every page), so it's filled in when the link is about to be used.
const withReturnTo = (event: SyntheticEvent<HTMLAnchorElement>) => {
  event.currentTarget.href = loginHref(
    window.location.pathname + window.location.search,
  );
};

/** A plain link: signing in is a full navigation through the auth route. */
export default function SignInLink({
  children = 'Sign in',
  className,
  onClick,
  ...data
}: Readonly<{
  children?: ReactNode;
  className?: string;
  /** after the return path is filled in (the menu closes) */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  [data: `data-${string}`]: string;
}>) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    withReturnTo(event);
    onClick?.(event);
  };
  return (
    <a
      {...data}
      className={className}
      href="/api/auth/login"
      onClick={handleClick}
      onFocus={withReturnTo}
      onPointerEnter={withReturnTo}
    >
      {children}
    </a>
  );
}
