'use client';

import { formatGrouped } from '@/lib/formatCount';

import { useShelfCount } from '../../_lib/shelfCounts';

/**
 * "218 finished": the Finished shelf's number (`useShelfCount`), so a
 * series finished or removed on this page moves both at once.
 */
export default function FinishedCount({
  finished,
  username,
}: Readonly<{ finished: number; username: string }>) {
  const shown = useShelfCount(username, 'finished', finished);
  return <>{`${formatGrouped(shown)} finished`}</>;
}
