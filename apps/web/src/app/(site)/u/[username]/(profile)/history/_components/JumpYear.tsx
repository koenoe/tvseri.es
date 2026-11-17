'use client';

import { type MouseEvent, useId } from 'react';

import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { plural } from '@/lib/format/text';
import { formatGrouped } from '@/lib/formatCount';
import type { MonthKey, JumpYear as Year } from '@/lib/profile/diary';
import JumpMonthLink from './JumpMonthLink';

/** A year in Jump to (`.rl-y`) and, open, its months */
export default function JumpYear({
  active,
  animate,
  basePath,
  onPick,
  onToggle,
  open,
  year,
}: Readonly<{
  active: MonthKey | null;
  /** Fade the months in (not on the first paint) */
  animate: boolean;
  basePath: string;
  onPick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onToggle: (year: number) => void;
  open: boolean;
  year: Year;
}>) {
  const monthsId = useId();
  const hasMonths = year.months.length > 0;
  const toggle = () => onToggle(year.year);
  const yearLabel = `${year.year}, ${plural(year.episodes, 'episode')}`;
  return (
    <li>
      <button
        aria-controls={hasMonths ? monthsId : undefined}
        aria-expanded={hasMonths ? open : undefined}
        aria-label={yearLabel}
        className="group/year flex h-9 w-full items-center gap-2.5 rounded-8 px-3 text-body-sm font-medium text-white/80 transition-colors hover:bg-white/5 aria-expanded:font-semibold aria-expanded:text-white"
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
        <span className="ml-auto text-meta font-normal tabular-nums text-white/60">
          {formatGrouped(year.episodes)}
        </span>
      </button>
      {open && hasMonths ? (
        <ul className="flex flex-col gap-0.5 pt-0.5" id={monthsId}>
          {year.months.map((month) => (
            <JumpMonthLink
              animate={animate}
              basePath={basePath}
              key={month.key}
              month={month}
              on={month.key === active}
              onPick={onPick}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
