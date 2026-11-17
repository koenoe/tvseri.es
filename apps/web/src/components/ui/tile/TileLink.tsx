'use client';

import Link from 'next/link';
import type {
  ComponentProps,
  FocusEvent,
  MouseEvent,
  PointerEvent,
} from 'react';

import { usePrefetch } from '@/lib/navigation/PrefetchProvider';

import { usePrefetchExhausted } from './prefetchBudget';
import { TILE_PREFETCH, type TilePrefetch } from './tilePrefetch';

type Props = Omit<ComponentProps<typeof Link>, 'href' | 'prefetch'> &
  Readonly<{
    href: string;
    /** `intent` for lists that never prefetch in view (search results) */
    prefetchOn?: TilePrefetch;
  }>;

/**
 * The link of a show or person tile in rows, grids, walls and search
 * results. Their prefetch policy is one constant, `TILE_PREFETCH`
 * (`tilePrefetch.ts`).
 * Whatever the policy, hover, keyboard focus and the first touch
 * (`pointerdown`, before the click) also prefetch: `router.prefetch` fetches
 * what a default `<Link>` would (the route's App Shell, Partial Prefetching)
 * and skips a route that is cached and fresh, so it only does work for a
 * tile the viewport prefetch didn't cover (scrolled past, expired) or one
 * that never prefetches in view (Next docs, "Prefetching" › "Manual
 * prefetch"). Primary navigation (header, tabs, sidebar, back links,
 * pagination) keeps the default `<Link>`.
 */
export default function TileLink({
  href,
  onFocus,
  onMouseEnter,
  onPointerDown,
  prefetchOn = TILE_PREFETCH,
  ...rest
}: Props) {
  const prefetchRoute = usePrefetch();
  const prefetch = () => prefetchRoute(href);
  const handleMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    prefetch();
    onMouseEnter?.(event);
  };
  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    prefetch();
    onFocus?.(event);
  };
  const handlePointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    prefetch();
    onPointerDown?.(event);
  };
  // A page that keeps failing to generate stops prefetching in view
  // (prefetchBudget); intent still prefetches it.
  const exhausted = usePrefetchExhausted(href);
  // `undefined` is Next's default (`auto`): the viewport prefetch
  const viewport = prefetchOn === 'intent' || exhausted ? false : undefined;
  return (
    <Link
      {...rest}
      href={href}
      onFocus={handleFocus}
      onMouseEnter={handleMouseEnter}
      onPointerDown={handlePointerDown}
      prefetch={viewport}
    />
  );
}
