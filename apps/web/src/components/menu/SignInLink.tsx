'use client';

import type { MouseEventHandler, ReactNode } from 'react';

import { fillLoginHref } from '@/auth/loginHref';

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
    fillLoginHref(event);
    onClick?.(event);
  };
  return (
    <a
      {...data}
      className={className}
      href="/api/auth/login"
      onClick={handleClick}
      onFocus={fillLoginHref}
      onPointerEnter={fillLoginHref}
    >
      {children}
    </a>
  );
}
