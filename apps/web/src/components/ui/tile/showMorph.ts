'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { motionWelcome } from '@/lib/media/motionWelcome';
import { isPlainClick } from '@/lib/navigation/isPlainClick';
import { showIdOf } from '@/lib/routing/showPath';
import { showMorphClass, showMorphName } from './showMorphNames';

/**
 * Opening a show from a big card keeps what you were looking at: the card's
 * logo glides into the show page's title, and its art grows from the card
 * to the page's backdrop as it dissolves into it. Everything else cuts.
 *
 * The cards that hand over (the Home Spotlight slide and Countdown, the
 * profile's Up next) mark themselves `data-show-morph-scope` and their two
 * parts `data-show-morph="art" | "logo"` (`data-show-morph-id` on a part, or
 * on an ancestor inside the scope, says whose they are where a card holds
 * several shows). Nothing is named until a plain click on a show link inside
 * such a card (`armShowMorph`): then only that card's parts get the show's
 * view-transition names, written straight onto the elements so no render
 * happens on the way out and no other card or tile can ever share a name.
 *
 * The show page's title takes the hand-off only when it renders in the
 * click's own navigation (`useShowMorphTarget`): after an intent prefetch
 * (`TileLink`) the show commits whole; without one the skeleton commits
 * first and the show arrives later, by when the card is hidden, so nothing
 * morphs. The show page's route boundary (`page.tsx`) starts the browser's
 * view transition for that commit, and the title carries the logo's name
 * from its first render (`morphName`), so the card's names make the pair.
 * Back never morphs: Next runs history traversal outside a transition.
 */

/**
 * The type a show link's navigation carries (`<Link transitionTypes>`), so
 * the hand-off's page-wide rules (globals.css) apply to it and to no other
 * view transition
 */
export const SHOW_OPEN_TYPES = ['show-open'];

type Armed = Readonly<{ parts: ReadonlyArray<HTMLElement>; seriesId: number }>;

let armed: Armed | null = null;
let expiry: ReturnType<typeof setTimeout> | undefined;

/**
 * A navigation that hasn't committed by now never had the show ready (no
 * prefetch came first): it commits the skeleton, which never morphs.
 */
const ARM_LIFETIME_MS = 1000;

/**
 * Only where the hand-off is cheap and wanted: a browser with view
 * transitions where motion is welcome (`motionWelcome`). Without a name
 * the click is a plain navigation.
 */
const canMorph = (): boolean =>
  typeof document.startViewTransition === 'function' && motionWelcome();

/** Forgets the hand-off and takes the names off the card */
export function settleShowMorph() {
  clearTimeout(expiry);
  if (armed === null) {
    return;
  }
  for (const element of armed.parts) {
    element.style.removeProperty('view-transition-name');
    element.style.removeProperty('view-transition-class');
  }
  armed = null;
}

/** Whose part this is, where the card holds several shows */
const ownerOf = (part: HTMLElement, scope: Element): number | null => {
  const owner = part.closest<HTMLElement>('[data-show-morph-id]');
  return owner && scope.contains(owner)
    ? Number(owner.dataset.showMorphId)
    : null;
};

type Click = Parameters<typeof isPlainClick>[0] &
  Readonly<{ currentTarget: Element; defaultPrevented: boolean }>;

/**
 * A click on a show link: inside a card that hands over, name that card's
 * parts for the show it opens. Call it from the link's click handler, before
 * the navigation starts (the browser captures the old page then).
 */
export function armShowMorph(click: Click) {
  settleShowMorph();
  if (click.defaultPrevented || !isPlainClick(click) || !canMorph()) {
    return;
  }
  const scope = click.currentTarget.closest('[data-show-morph-scope]');
  const seriesId = showIdOf(click.currentTarget.getAttribute('href') ?? '');
  if (!scope || seriesId === null) {
    return;
  }
  // the last of each part: the top layer, where a card cross-fades slides
  const parts = new Map<string, HTMLElement>();
  for (const part of scope.querySelectorAll<HTMLElement>('[data-show-morph]')) {
    const owner = ownerOf(part, scope);
    if (owner === null || owner === seriesId) {
      parts.set(part.dataset.showMorph ?? '', part);
    }
  }
  for (const [part, element] of parts) {
    if (part === 'art' || part === 'logo') {
      element.style.setProperty(
        'view-transition-name',
        showMorphName(part, seriesId),
      );
      element.style.setProperty('view-transition-class', showMorphClass(part));
    }
  }
  armed = { parts: [...parts.values()], seriesId };
  expiry = setTimeout(settleShowMorph, ARM_LIFETIME_MS);
}

/**
 * Does this show page take the hand-off? Only the show the click opened,
 * and only while its card is still on screen: the page is rendering in the
 * click's own navigation. Read once, at the page's first render.
 */
export function claimShowMorph(seriesId: number): boolean {
  return (
    armed?.seriesId === seriesId &&
    armed.parts.some(
      (part) => part.isConnected && part.getClientRects().length > 0,
    )
  );
}

/**
 * The show page's side: whether this mount takes the hand-off (fixed for
 * its life, so the `<ViewTransition>` around it never comes or goes and
 * remounts what it wraps). Every show page settles a hand-off once it is
 * in, taken or not. Taking it opens the page at the top before the browser
 * reads where the title landed: the router's own scroll to the top
 * (`NavigationTracker`) comes a microtask later, after React has checked
 * the title is in view, so a card far down Home would morph into nothing.
 * Only once: Back shows a page Next kept (a hidden `<Activity>`) again,
 * re-running its layout effects, and it must stay where it was scrolled.
 */
export function useShowMorphTarget(seriesId: number): boolean {
  const [morph] = useState(
    () => typeof window !== 'undefined' && claimShowMorph(seriesId),
  );
  const opened = useRef(false);
  useLayoutEffect(() => {
    if (morph && !opened.current) {
      opened.current = true;
      window.scrollTo({ behavior: 'instant', left: 0, top: 0 });
    }
    settleShowMorph();
  }, [morph]);
  return morph;
}
