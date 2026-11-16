'use client';

import type { ReactNode } from 'react';

import { visiblePills } from './model';
import { useSelectedYear } from './YearLink';

/** Pills that fit beside "More" at 390px ("2026 so far" is the widest) */
const FIT = 3;

/**
 * The phone's pill row: which years have a pill depends on the year in the
 * URL (it always has one, `visiblePills`), so the row is chosen here, from
 * pills the server drew, and follows a year switch without a server render.
 */
export default function YearPills({
  more,
  pills,
}: Readonly<{
  /** "More", for more than one year */
  more: ReactNode;
  pills: ReadonlyArray<Readonly<{ year: number; pill: ReactNode }>>;
}>) {
  const selected = useSelectedYear() ?? Number.NaN;
  const all = pills.map((item) => item.year);
  const shown = visiblePills(all, selected, FIT);
  const row = pills.filter((item) => shown.years.includes(item.year));
  return (
    <ul className="flex gap-1.5">
      {row.map((item) => (
        <li key={item.year}>{item.pill}</li>
      ))}
      {shown.more ? <li>{more}</li> : null}
    </ul>
  );
}
