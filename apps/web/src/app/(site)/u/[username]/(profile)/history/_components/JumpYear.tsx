'use client';

import { formatGrouped, plural } from '@tvseri.es/utils';
import { AnimatePresence } from 'motion/react';
import { type MouseEvent, memo, useCallback, useId } from 'react';

import FoldPresence from '@/components/motion/FoldPresence';
import useMaxFeatures from '@/components/motion/useMaxFeatures';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import type { MonthKey, JumpYear as Year } from '@/lib/profile/diary';
import JumpMonthLink from './JumpMonthLink';
import { JUMP_MONTHS, JUMP_YEAR } from './jumpStyles';

const YEAR_ROW = `group/year ${JUMP_YEAR} text-body-sm max-lg:text-body font-medium text-white/80 transition-colors hover:bg-white/5 aria-expanded:font-semibold aria-expanded:text-white`;

/**
 * A year in Jump to and, open, its months. Once the viewer has opened a year
 * the months fold open and shut (`FoldPresence`); before that (the first
 * paint, the scroll opening the reading month's year) and until Motion's
 * features are in (the list sits in a `MaxMotion`), they show and go at
 * once. Memoised: `active` is the reading month only for its own year, so a
 * scroll re-renders one or two years.
 */
function JumpYear({
  active,
  animate,
  basePath,
  onPick,
  onToggle,
  open,
  year,
}: Readonly<{
  active: MonthKey | null;
  /** Fold the months open and shut (the viewer has opened a year) */
  animate: boolean;
  basePath: string;
  onPick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onToggle: (year: number) => void;
  open: boolean;
  year: Year;
}>) {
  const monthsId = useId();
  const hasMonths = year.months.length > 0;
  // without its renderer a fold would sit shut
  const live = useMaxFeatures() !== null;
  const folds = animate && live;
  const toggle = useCallback(() => onToggle(year.year), [onToggle, year.year]);
  const yearLabel = `${year.year}, ${plural(year.episodes, 'episode')}`;
  // the list item is the list's (`YearsFold`, or `JumpList`'s own list)
  return (
    <>
      <button
        aria-controls={hasMonths ? monthsId : undefined}
        aria-expanded={hasMonths ? open : undefined}
        aria-label={yearLabel}
        className={YEAR_ROW}
        onClick={toggle}
        type="button"
      >
        <Icon
          // contrast-exempt: the chevron icon
          className="text-white/50 transition-transform duration-200 ease-[cubic-bezier(.2,.8,.2,1)] group-aria-expanded/year:rotate-90"
          glyph={chevronRightGlyph}
          size={16}
        />
        {year.year}
        <span className="ml-auto text-meta font-normal tabular-nums text-white/60 max-lg:text-body-sm">
          {formatGrouped(year.episodes)}
        </span>
      </button>
      <AnimatePresence custom={folds} initial={false}>
        {open && hasMonths ? (
          <FoldPresence appear={folds} key="months" whenAsked>
            <ul className={JUMP_MONTHS} id={monthsId}>
              {year.months.map((month) => {
                const on = month.key === active;
                return (
                  <JumpMonthLink
                    basePath={basePath}
                    key={month.key}
                    month={month}
                    on={on}
                    onPick={onPick}
                  />
                );
              })}
            </ul>
          </FoldPresence>
        ) : null}
      </AnimatePresence>
    </>
  );
}

const MemoJumpYear = memo(JumpYear);
MemoJumpYear.displayName = 'JumpYear';

export default MemoJumpYear;
