'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
  chevronLeftGlyph,
  chevronRightGlyph,
} from '@/components/ui/icon/glyphs';
import scrollBehavior from '@/lib/media/scrollBehavior';

import ArrowButton from './ArrowButton';
import {
  getPageTarget,
  getRowPosition,
  type PageDirection,
  type RowPosition,
} from './paging';

type Props = Readonly<{
  /** the rail's element id (also the arrows' `aria-controls`) */
  railId: string;
  /** the row's title: "Previous: Top Picks for November" */
  title: string;
}>;

type Measured = RowPosition | 'unmeasured';

const unmeasured = (): Measured => 'unmeasured';

function pageRail(rail: HTMLElement, direction: PageDirection) {
  const items = Array.from(rail.children as HTMLCollectionOf<HTMLElement>);
  const left = getPageTarget(direction, {
    clientWidth: rail.clientWidth,
    items: items.map((item) => ({
      left: item.offsetLeft,
      width: item.offsetWidth,
    })),
    paddingStart: Number.parseFloat(getComputedStyle(rail).paddingLeft) || 0,
    scrollLeft: rail.scrollLeft,
    scrollWidth: rail.scrollWidth,
  });
  rail.scrollTo({ behavior: scrollBehavior(), left });
}

/**
 * The two round arrows at the end of a row's header.
 * They page the rail by its visible width (smoothly, or at once with
 * reduced motion), dim at the ends and stay focused after paging. Only for a fine pointer with hover; touch swipes.
 *
 * The rail is measured, never counted: until it is (server render and
 * hydration) and whenever it fits, the pair isn't rendered at all. That can't
 * shift anything: the pair overflows the header's title line and nothing
 * sits after it.
 */
export default function RowArrows({ railId, title }: Props) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const rail = document.getElementById(railId);
      if (!rail) {
        return () => {};
      }
      const observer = new ResizeObserver(onChange);
      observer.observe(rail);
      // an item that widens (a spread stack) overflows the rail without
      // resizing it
      for (const item of Array.from(rail.children)) {
        observer.observe(item);
      }
      rail.addEventListener('scroll', onChange, { passive: true });
      return () => {
        observer.disconnect();
        rail.removeEventListener('scroll', onChange);
      };
    },
    [railId],
  );
  const getSnapshot = useCallback((): Measured => {
    const rail = document.getElementById(railId);
    return rail ? getRowPosition(rail) : 'unmeasured';
  }, [railId]);
  const position = useSyncExternalStore(subscribe, getSnapshot, unmeasured);

  const page = useCallback(
    (direction: PageDirection) => {
      const rail = document.getElementById(railId);
      if (rail) {
        pageRail(rail, direction);
      }
    },
    [railId],
  );
  const pagePrevious = useCallback(() => page('previous'), [page]);
  const pageNext = useCallback(() => page('next'), [page]);

  if (position === 'unmeasured' || position === 'fits') {
    return null;
  }
  const atStart = position === 'start';
  const atEnd = position === 'end';
  const previousLabel = `Previous: ${title}`;
  const nextLabel = `Next: ${title}`;
  return (
    <span className="-my-1.5 ml-auto hidden shrink-0 items-center gap-2 md:[@media(hover:hover)_and_(pointer:fine)]:flex">
      <ArrowButton
        controls={railId}
        disabled={atStart}
        glyph={chevronLeftGlyph}
        label={previousLabel}
        onPage={pagePrevious}
      />
      <ArrowButton
        controls={railId}
        disabled={atEnd}
        glyph={chevronRightGlyph}
        label={nextLabel}
        onPage={pageNext}
      />
    </span>
  );
}
