'use client';

import type { Page, StatsYears } from '@tvseri.es/schemas';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import cn from '@/lib/cn';
import type { DiaryItem } from '@/lib/profile/views';
import profilePath from '@/lib/routing/profilePath';
import InfiniteScroll from '../../_components/pagination/InfiniteScroll';
import PaginationNotice from '../../_components/pagination/PaginationNotice';
import { isJumping, setJumping, useJumping } from '../_lib/activeMonth';
import type { MonthKey } from '../_lib/diary';
import useActiveMonthTracker from '../_lib/useActiveMonthTracker';
import useDiary from '../_lib/useDiary';
import { scrollToDiaryTop } from '../_lib/useDiaryJump';
import DiaryEnd from './DiaryEnd';
import DiaryMonth from './DiaryMonth';
import JumpSheet, { JumpButton } from './JumpSheet';
import NewerLink from './NewerLink';
import useRowRenderer from './useRowRenderer';

type Week = Readonly<{ episodes: number; last: string | null }>;

/**
 * The History diary: months with their headers,
 * days, one row per show per day; 100 episodes a read as you scroll; after
 * a jump, "Newer" above. The owner's rows carry the Remote on hover; a
 * visitor's carry "New to you" and + once per show new to them. A jump
 * fades the list out (120ms) until the new one lands, then scrolls to its
 * top. Phones get Jump in each month header (the sheet). Each month has
 * its own Motion renderer, armed on first touch (`diaryMotion`).
 */
export default function Diary({
  first,
  month,
  owner,
  timeZone,
  undated,
  username,
  week,
  years,
}: Readonly<{
  first: Page<DiaryItem>;
  month: MonthKey | null;
  owner: boolean;
  /** The owner's zone: the days and months are local days in it */
  timeZone: string;
  undated: number;
  username: string;
  week: Week | null;
  years: StatsYears['years'] | null;
}>) {
  const listRef = useRef<HTMLDivElement>(null);
  const diary = useDiary({
    first,
    listRef,
    month,
    timeZone,
    username,
    years,
  });
  const { months } = diary;
  const jumping = useJumping();
  useActiveMonthTracker(listRef, months);

  // A jump's list landed (a new first page): to its top, and show it. Only
  // a jump's: a tab press, Back or Forward also bring a new first page
  // when the diary was kept from an earlier visit (the router hides a left
  // page and shows it again), and those keep their own place (the top,
  // or the browser's restored offset).
  const [seenFirst, setSeenFirst] = useState(first);
  useLayoutEffect(() => {
    if (seenFirst !== first) {
      setSeenFirst(first);
      if (isJumping()) {
        scrollToDiaryTop();
      }
    }
    setJumping(false);
  }, [first, seenFirst]);

  const [sheet, setSheet] = useState(false);
  const openSheet = useCallback(() => setSheet(true), []);
  const jump = useMemo(() => <JumpButton onOpen={openSheet} />, [openSheet]);

  const { newRows, renderRow } = useRowRenderer(owner, months);
  const basePath = profilePath(username, 'history');
  const classes = cn(
    'transition-opacity duration-[120ms]',
    jumping && 'opacity-0',
  );

  return (
    <>
      <div className={classes} data-diary ref={listRef}>
        {diary.newer ? (
          <NewerLink
            busy={diary.beforeStatus === 'loading'}
            onLoad={diary.newer.load}
            title={diary.newer.title}
          />
        ) : null}
        <InfiniteScroll hasMore={diary.canLoadMore} loadMore={diary.loadMore}>
          {months.map((entry) => {
            const monthNew = newRows.get(entry.key);
            const skippable = month === null || entry.key <= month;
            return (
              <DiaryMonth
                jump={jump}
                key={entry.key}
                month={entry}
                newRows={monthNew}
                renderRow={renderRow}
                skippable={skippable}
              />
            );
          })}
        </InfiniteScroll>
        <PaginationNotice onRetry={diary.loadMore} status={diary.status} />
        <DiaryEnd more={diary.canLoadMore} owner={owner} undated={undated} />
      </div>
      <JumpSheet
        basePath={basePath}
        index={diary.index}
        onOpenChange={setSheet}
        open={sheet}
        week={week}
      />
    </>
  );
}
