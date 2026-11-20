'use client';

import Link from 'next/link';
import type { ComponentProps, FocusEvent, MouseEvent } from 'react';

import { getBackgroundImageProps } from '@/components/background/BackgroundImage';
import preloadImage from '@/components/background/preloadImage';
import { usePrefetch } from '@/lib/navigation/PrefetchProvider';
import useLinkIntent from '@/lib/navigation/useLinkIntent';
import { showIdOf } from '@/lib/routing/showPath';

import { usePrefetchExhausted } from './prefetchBudget';
import { armShowMorph, SHOW_OPEN_TYPES } from './showMorph';
import { TILE_PREFETCH, type TilePrefetch } from './tilePrefetch';

/** Ours, then the caller's own handler */
const both =
  <E,>(ours: (event: E) => void, theirs?: (event: E) => void) =>
  (event: E) => {
    ours(event);
    theirs?.(event);
  };

type Props = Omit<ComponentProps<typeof Link>, 'href' | 'prefetch'> &
  Readonly<{
    /** The show's backdrop: decoded on intent, so its page opens with it */
    backdrop?: string | null;
    href: string;
    /** The place's own warm-up on intent (a resume card's episode modal) */
    onIntent?: () => void;
    /**
     * The place decides when the show opens whole, not the pointer (search:
     * its arrows only). Unset: a resting mouse or keyboard focus does.
     */
    opensWhole?: boolean;
    /** `intent` for lists that never prefetch in view (search results) */
    prefetchOn?: TilePrefetch;
  }>;

/**
 * The link of a show or person tile in rows, grids, walls and search
 * results. Their prefetch policy lives in `tilePrefetch.ts` (`TILE_PREFETCH`,
 * `PERSON_PREFETCH` for people). Whatever the policy, hover, keyboard focus
 * and the first touch (`pointerdown`, before the click) also prefetch: `router.prefetch` fetches
 * what a default `<Link>` would (the route's App Shell, Partial Prefetching)
 * and skips a route that is cached and fresh, so it only does work for a
 * tile the viewport prefetch didn't cover (scrolled past, expired) or one
 * that never prefetches in view (Next docs, "Prefetching" › "Manual
 * prefetch"). Primary navigation (header, tabs, sidebar, back links,
 * pagination) keeps the default `<Link>`.
 *
 * A show's link also opens it whole on intent (`useLinkIntent`: a resting
 * mouse or keyboard focus, never a tap): it becomes a per-link prefetch of
 * the show's page and decodes its backdrop, once per page per session. A
 * click inside a card that hands its art over arms that hand-off
 * (`showMorph.ts`).
 */
export default function TileLink({
  backdrop,
  href,
  onBlur,
  onClick,
  onFocus,
  onIntent,
  onMouseEnter,
  onPointerCancel,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onPointerUp,
  opensWhole,
  prefetchOn = TILE_PREFETCH,
  ...rest
}: Props) {
  const prefetchRoute = usePrefetch();
  const seriesId = showIdOf(href);
  const prefetch = () => prefetchRoute(href);
  const warm = () => {
    onIntent?.();
    if (backdrop) {
      const image = getBackgroundImageProps(backdrop);
      preloadImage(image.src, image).catch(() => undefined);
    }
  };
  // A page that keeps failing to generate stops prefetching in view
  // (prefetchBudget) and never opens whole on a new intent. Read when the
  // intent comes, not after: the per-link prefetch is itself one of the
  // fetches the budget counts, and must not cancel itself.
  const exhausted = usePrefetchExhausted(href);
  const enabled = seriesId !== null && opensWhole === undefined && !exhausted;
  const { handlers, intent } = useLinkIntent(href, { enabled, onIntent: warm });
  const handleMouseEnter = both(prefetch, onMouseEnter);
  const handleFocus = both((event: FocusEvent<HTMLAnchorElement>) => {
    prefetch();
    handlers.onFocus(event);
  }, onFocus);
  const handleBlur = both(handlers.onBlur, onBlur);
  const handlePointerEnter = both(handlers.onPointerEnter, onPointerEnter);
  const handlePointerLeave = both(handlers.onPointerLeave, onPointerLeave);
  const handlePointerDown = both(() => {
    prefetch();
    handlers.onPointerDown();
  }, onPointerDown);
  const handlePointerUp = both(handlers.onPointerUp, onPointerUp);
  const handlePointerCancel = both(handlers.onPointerCancel, onPointerCancel);
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    armShowMorph(event);
  };
  // `undefined` is Next's default (`auto`): the viewport prefetch
  const viewport = prefetchOn === 'intent' || exhausted ? false : undefined;
  const whole = seriesId !== null && (opensWhole ?? intent);
  const policy = whole ? true : viewport;
  const transitionTypes = seriesId === null ? undefined : SHOW_OPEN_TYPES;
  return (
    <Link
      {...rest}
      href={href}
      onBlur={handleBlur}
      onClick={handleClick}
      onFocus={handleFocus}
      onMouseEnter={handleMouseEnter}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      prefetch={policy}
      transitionTypes={transitionTypes}
    />
  );
}
