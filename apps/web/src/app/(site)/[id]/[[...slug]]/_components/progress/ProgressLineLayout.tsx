import type { ReactNode } from 'react';

import cn from '@/lib/cn';

/**
 * The progress line's layout, one rule for the hero, the history sheet
 * and the hero's placeholder, by its own width (a container query, not
 * the viewport):
 *
 * - wide: one row, the bar taking what the rest leaves:
 *   "━━━━━━  76% · 312 watched · 68 skipped · 46h left  ›"
 * - under 28rem (a phone): the bar with the % at the row's end, then the
 *   facts on one line with `end` (a chevron) at its end:
 *   "━━━━━━━━━━━━━━━━━━━━  76%"
 *   "312 watched · 68 skipped · 46h left               ›"
 *
 * One flex row; under 28rem the facts and the chevron take a whole row of
 * their own (`basis-full`), so the % keeps the bar's row. The bar sits
 * 14px above the facts' line: 8px of the %'s 20px row under its centred
 * bar, then the 6px row gap.
 */
const ROOT = '@container block min-w-0 flex-1';
const ROW = 'flex min-w-0 items-center @max-md:flex-wrap @max-md:gap-y-1.5';
/** At least 80px: a phone's facts row (`basis-full`) never joins the bar's */
const TRACK = 'flex h-5 min-w-20 flex-1 items-center';
/** A flex box, so the row is the %'s 20px line, not the page's taller strut */
const PERCENT = 'ml-4 flex @max-md:ml-3';
const LINE = 'flex min-w-0 items-center @max-md:basis-full';
/** Signed out there is no %: the size keeps its distance from the bar */
const LINE_ALONE = cn(LINE, 'ml-4 @max-md:ml-0');
const FACTS = 'flex min-w-0 flex-1';
const END = 'ml-3 flex shrink-0';

export default function ProgressLineLayout({
  end,
  facts,
  percent,
  track,
}: Readonly<{
  end?: ReactNode;
  facts: ReactNode;
  /** The % (none signed out: the size has no share) */
  percent?: ReactNode;
  track: ReactNode;
}>) {
  return (
    <span className={ROOT}>
      <span className={ROW}>
        <span className={TRACK}>{track}</span>
        {percent ? <span className={PERCENT}>{percent}</span> : null}
        <span className={percent ? LINE : LINE_ALONE}>
          <span className={FACTS}>{facts}</span>
          {end ? <span className={END}>{end}</span> : null}
        </span>
      </span>
    </span>
  );
}
