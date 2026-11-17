'use client';

import { type RefObject, useEffect } from 'react';
import type { DiaryMonth } from '@/lib/profile/diary';
import { getActiveMonth, setActiveMonth } from './activeMonth';

/**
 * A band near the top of the screen, under the header pill: the first
 * month section crossing it is the one you're reading.
 */
const BAND = '-96px 0px -70% 0px';

/**
 * Follows the scroll with an IntersectionObserver on the month sections
 * (no scroll handler): the topmost one in the band is the active month.
 * Before anything intersects (or with one month), the first month. When
 * the diary goes, so does its month: the next History visit starts from
 * the month its diary opens at (Jump to's first paint), not from where
 * this one was left.
 */
export default function useActiveMonthTracker(
  listRef: RefObject<HTMLElement | null>,
  months: ReadonlyArray<DiaryMonth>,
) {
  const keys = months.map((month) => month.key).join(',');
  useEffect(() => () => setActiveMonth(null), []);
  useEffect(() => {
    const list = listRef.current;
    const ordered = keys ? keys.split(',') : [];
    // a page appended keeps the month you're in; a new list starts at its top
    const current = getActiveMonth();
    if (current === null || !ordered.includes(current)) {
      setActiveMonth(ordered[0] ?? null);
    }
    if (!list || ordered.length === 0) {
      return;
    }
    const inBand = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.month ?? '';
          if (entry.isIntersecting) {
            inBand.add(key);
          } else {
            inBand.delete(key);
          }
        }
        const top = ordered.find((key) => inBand.has(key));
        if (top) {
          setActiveMonth(top);
        }
      },
      { rootMargin: BAND },
    );
    for (const section of list.querySelectorAll('section[data-month]')) {
      observer.observe(section);
    }
    return () => observer.disconnect();
  }, [keys, listRef]);
}
