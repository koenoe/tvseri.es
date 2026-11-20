'use client';

import { type ReactNode, useRef } from 'react';

import { useLinkGlide } from '@/components/motion/fillGlide';

import { visiblePills } from './model';
import { useSelectedYear, YearPressContext } from './YearLink';

/** Pills that fit beside "More" at 390px ("2026 so far" is the widest) */
const FIT = 3;

/**
 * The phone's pill row: which years have a pill depends on the year in the
 * URL (it always has one, `visiblePills`), so the row is chosen here, from
 * pills the server drew, and follows a year switch without a server render.
 * The white fill glides from the year that was open to the pill pressed
 * (`useLinkGlide`); a year picked in the sheet, Back and Forward put it in
 * place.
 */
export default function YearPills({
  more,
  pills,
}: Readonly<{
  /** "More", for more than one year */
  more: ReactNode;
  pills: ReadonlyArray<Readonly<{ year: number; pill: ReactNode }>>;
}>) {
  const list = useRef<HTMLUListElement>(null);
  const selected = useSelectedYear() ?? Number.NaN;
  const onPress = useLinkGlide(() => list.current, selected);
  const all = pills.map((item) => item.year);
  const shown = visiblePills(all, selected, FIT);
  const row = pills.filter((item) => shown.years.includes(item.year));
  return (
    <YearPressContext value={onPress}>
      <ul className="flex gap-1.5" ref={list}>
        {row.map((item) => (
          <li key={item.year}>{item.pill}</li>
        ))}
        {shown.more ? <li>{more}</li> : null}
      </ul>
    </YearPressContext>
  );
}
