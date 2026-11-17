'use client';

import { useSearchParams } from 'next/navigation';
import { WIDE_LG } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';
import {
  type JumpYear,
  openingMonth,
  parseMonthKey,
} from '@/lib/profile/diary';
import { useActiveMonth } from '../_lib/activeMonth';
import JumpList from './JumpList';

/**
 * The sidebar's Jump to: the white month follows the diary's scroll. Until
 * the diary has said (its tracker runs after hydration), it is the month
 * the diary opens at, so the first paint already has it white and its year
 * open.
 */
export default function JumpTo({
  basePath,
  index,
  week,
}: Readonly<{
  basePath: string;
  index: ReadonlyArray<JumpYear>;
  week: Readonly<{ episodes: number; last: string | null }> | null;
}>) {
  const from = parseMonthKey(useSearchParams().get('month'));
  // below `lg` the sidebar is hidden: the month header's sheet has the list
  const shown = useMediaQuery(WIDE_LG);
  const active = useActiveMonth(shown) ?? openingMonth(index, from);
  return (
    <JumpList active={active} basePath={basePath} index={index} week={week} />
  );
}
