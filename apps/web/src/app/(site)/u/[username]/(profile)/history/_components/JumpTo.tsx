'use client';

import { useSearchParams } from 'next/navigation';
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
  const active = useActiveMonth() ?? openingMonth(index, from);
  return (
    <JumpList active={active} basePath={basePath} index={index} week={week} />
  );
}
