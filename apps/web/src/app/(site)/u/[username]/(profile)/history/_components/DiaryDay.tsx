'use client';

import * as m from 'motion/react-m';
import type { CSSProperties, ReactNode } from 'react';

import cn from '@/lib/cn';

import type { DiaryDay as Day } from '@/lib/profile/diary';
import { useDiaryLayout } from './diaryMotion';
import { DIARY_DAY, DIARY_DAY_SKIPPED, DIARY_ROWS } from './diaryStyles';

/**
 * A day: weekday and date on the left, one row per show watched that day
 * on the right. Off screen it is skipped
 * (`content-visibility`) at its own height from its row count, so a month
 * of 200 rows renders the days in view, not all at once as it scrolls in
 * (WebKit dropped 5–12 frames per month on a 2,000-row diary). Not in a
 * month loaded above the reader (`skippable`, see `DiaryMonth`).
 */
export default function DiaryDay({
  children,
  day,
  skippable = true,
}: Readonly<{ children: ReactNode; day: Day; skippable?: boolean }>) {
  const layout = useDiaryLayout();
  const style = skippable
    ? ({ '--rows': day.rows.length } as CSSProperties)
    : undefined;
  const dayClass = cn(DIARY_DAY, skippable && DIARY_DAY_SKIPPED);
  return (
    <m.div className={dayClass} data-diary-day style={style} {...layout}>
      <time className="flex flex-col items-start" dateTime={day.key}>
        <span className="text-overline uppercase text-white/60">
          {day.weekday}
        </span>
        <span className="text-[28px] font-bold leading-8 tabular-nums max-md:text-[22px] max-md:leading-[26px]">
          {day.day}
        </span>
      </time>
      <div className={DIARY_ROWS}>{children}</div>
    </m.div>
  );
}
