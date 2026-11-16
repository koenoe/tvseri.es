'use client';

import type { Page, StatsYears } from '@tvseri.es/schemas';
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { DiaryItem } from '@/lib/profile/views';

import usePaginated from '../../_lib/pagination/usePaginated';
import useScrollAnchor from '../../_lib/pagination/useScrollAnchor';
import {
  createDiary,
  type MonthKey,
  monthIndex,
  newerMonth,
  parseMonthKey,
} from './diary';

/** The day rows the scroll anchor holds in place while a month lands above */
const ANCHOR = '[data-diary-day]';

const monthTitle = (key: MonthKey, index: ReturnType<typeof monthIndex>) =>
  index.flatMap((year) => year.months).find((month) => month.key === key)
    ?.title ?? key;

/** `?month=` on the URL without a new entry or a server render (Next keeps the router in step) */
function replaceMonth(month: MonthKey | null) {
  const url = new URL(window.location.href);
  if (parseMonthKey(url.searchParams.get('month')) === month) {
    return;
  }
  if (month) {
    url.searchParams.set('month', month);
  } else {
    url.searchParams.delete('month');
  }
  window.history.replaceState(window.history.state, '', url);
}

/**
 * The diary's pages: 100 episodes a read below (`?month=` keeps its range
 * on every page), and after a jump the month above on "Newer" (`within`,
 * the whole month) with the reader's place held. The URL follows the top
 * month (`?month=`, dropped once the newest is loaded), so a reload lands
 * where you are; Back restores everything loaded, above and below.
 */
export default function useDiary({
  first,
  listRef,
  month,
  timeZone,
  username,
  years,
}: Readonly<{
  first: Page<DiaryItem>;
  listRef: RefObject<HTMLElement | null>;
  month: MonthKey | null;
  timeZone: string;
  username: string;
  years: StatsYears['years'] | null;
}>) {
  const base = `/api/u/${encodeURIComponent(username)}/watched`;
  const endpoint = month ? `${base}?month=${month}` : base;
  const index = useMemo(() => (years ? monthIndex(years) : []), [years]);
  const initialPrevCursor = month
    ? (newerMonth(month, index)?.key ?? null)
    : null;
  const paged = usePaginated<DiaryItem>({
    beforeParam: 'within',
    endpoint,
    initialCursor: first.nextCursor,
    initialItems: first.items,
    initialPrevCursor,
    restoreKey: endpoint,
  });
  // regroups only the months a page changed: the rest keep their objects
  const [diary] = useState(createDiary);
  const months = useMemo(
    () => diary(paged.items, years ?? undefined, timeZone),
    [diary, paged.items, timeZone, years],
  );
  const capture = useScrollAnchor(listRef, paged.items, ANCHOR);
  const { loadBefore, prevCursor } = paged;
  const loadNewer = useCallback(() => {
    void loadBefore({ onPrepend: capture });
  }, [capture, loadBefore]);

  // the top month while there is more above it; none at the newest
  const top = prevCursor ? (months[0]?.key ?? null) : null;
  useEffect(() => {
    if (month !== null || top !== null) {
      replaceMonth(top);
    }
  }, [month, top]);

  const newer = prevCursor
    ? { load: loadNewer, title: monthTitle(prevCursor, index) }
    : null;
  return {
    beforeStatus: paged.beforeStatus,
    canLoadMore: paged.canLoadMore,
    index,
    loadMore: paged.loadMore,
    months,
    newer,
    status: paged.status,
  } as const;
}
