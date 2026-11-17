'use client';

import { memo, type ReactNode, useId } from 'react';

import ArmedMaxMotion from '@/components/motion/ArmedMaxMotion';

import type { DiaryMonth as Month, DiaryRow as Row } from '../_lib/diary';
import DiaryDay from './DiaryDay';
import DiaryRow from './DiaryRow';
import { DiaryLayoutProvider, useMonthLayout } from './diaryMotion';
import { DIARY_MONTH } from './diaryStyles';
import MonthHeader from './MonthHeader';

const defaultRow = (row: Row) => <DiaryRow key={row.key} row={row} />;

/** Draws one row; `isNew`: a visitor's first row of a show new to them */
export type RenderRow = (row: Row, isNew: boolean) => ReactNode;

/**
 * One month of the diary: its header and its days. Each day off screen
 * is skipped (`content-visibility`, `DIARY_DAY_SKIPPED`) at its own height
 * from its row count, so a long diary costs little to scroll; rows opening inside it move the rows below
 * (`diaryMotion`). The page renders each row (`renderRow`: the ⋯ for the
 * owner, a tag for a visitor) and the phone's Jump (`jump`). Memoised: a
 * page landing below re-renders only the months it changed (`createDiary`
 * keeps the others' objects; `renderRow` and `newRows` are stable).
 */
function DiaryMonth({
  jump,
  month,
  newRows,
  renderRow = defaultRow,
  skippable = true,
}: Readonly<{
  jump?: ReactNode;
  month: Month;
  /** A visitor's rows to tag "New to you" in this month (stable while they don't change) */
  newRows?: ReadonlySet<string>;
  renderRow?: RenderRow;
  /**
   * Off screen, skip its days (`content-visibility`). Not for a month loaded above
   * the reader ("Newer"): it goes off screen in the commit that adds it,
   * before WebKit remembers its real height, and the estimate would move
   * the page under the reader.
   */
  skippable?: boolean;
}>) {
  const layout = useMonthLayout();
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={DIARY_MONTH}
      data-month={month.key}
      onFocusCapture={layout.arm}
      onPointerDownCapture={layout.arm}
    >
      <MonthHeader
        action={jump}
        id={titleId}
        line={month.line}
        title={month.title}
      />
      <ArmedMaxMotion armed={layout.armed}>
        <DiaryLayoutProvider value={layout}>
          {month.days.map((day) => (
            <DiaryDay day={day} key={day.key} skippable={skippable}>
              {day.rows.map((row) =>
                renderRow(row, newRows?.has(row.key) ?? false),
              )}
            </DiaryDay>
          ))}
        </DiaryLayoutProvider>
      </ArmedMaxMotion>
    </section>
  );
}

const MemoDiaryMonth = memo(DiaryMonth);
MemoDiaryMonth.displayName = 'DiaryMonth';

export default MemoDiaryMonth;
