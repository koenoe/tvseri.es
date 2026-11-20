'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

import useLinkIntent from '@/lib/navigation/useLinkIntent';

type Props = Omit<
  ComponentProps<typeof Link>,
  | 'href'
  | 'onBlur'
  | 'onFocus'
  | 'onPointerCancel'
  | 'onPointerDown'
  | 'onPointerEnter'
  | 'onPointerLeave'
  | 'onPointerUp'
  | 'prefetch'
> &
  Readonly<{
    href: string;
    /** The view transition types the navigation adds when motion is welcome */
    motionTypes?: string[];
  }>;

/**
 * A single link whose page is worth having before the click: on intent
 * (`useLinkIntent`) it asks for a per-link prefetch (`prefetch={true}`),
 * which carries the page's URL-specific cached content, so the click can
 * commit it at once. Never on sight: one request per page per session,
 * only when it is about to be followed. Until then, Next's default (the
 * route's App Shell in view). For one link, never a grid of them.
 */
export default function IntentLink({ href, motionTypes, ...rest }: Props) {
  const { handlers, intent, motion } = useLinkIntent(href);
  // `undefined` is Next's default prefetch (`auto`)
  const prefetch = intent ? true : undefined;
  const transitionTypes = motion ? motionTypes : undefined;
  return (
    <Link
      {...rest}
      {...handlers}
      href={href}
      prefetch={prefetch}
      transitionTypes={transitionTypes}
    />
  );
}
