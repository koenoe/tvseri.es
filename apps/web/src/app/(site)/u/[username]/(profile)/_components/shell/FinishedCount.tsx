'use client';

import FlashRing from '@/components/motion/FlashRing';
import RollingCount from '@/components/motion/RollingCount';

import { useShelfCount, useShelfLanding } from '../../_lib/shelfCounts';

/** The ring's box: the line's height, a pixel wider than the words (the separator sits close) */
const RING_BOX = '-inset-x-px';

/**
 * "218 finished": the Finished shelf's number (`useShelfCount`), so a
 * series finished or removed on this page moves both at once; the number
 * rolls to its new value. A show that N finishes here (it leaves Watching
 * for Finished) also rings the count once, the calendar's Today ring: it
 * went here.
 */
export default function FinishedCount({
  finished,
  username,
}: Readonly<{ finished: number; username: string }>) {
  const shown = useShelfCount(username, 'finished', finished);
  const landed = useShelfLanding(username, 'finished');
  return (
    <span className="relative rounded-6">
      <RollingCount value={shown} /> finished
      {landed === 0 ? null : <FlashRing className={RING_BOX} key={landed} />}
    </span>
  );
}
