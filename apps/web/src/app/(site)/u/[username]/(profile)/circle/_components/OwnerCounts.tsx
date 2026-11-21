'use client';

import RollingCount from '@/components/motion/RollingCount';

import { useFollowingShown } from '../../_components/shell/followCount';
import { circleCountParts } from '../../_lib/circleCopy';

/**
 * "8 following · 6 followers" on your own Circle, in `circleCounts`'
 * format (a visitor's is that line): a Follow back (or an unfollow) on a row counts at once,
 * the number rolling to it (`RollingCount`), before the page's refresh
 * brings the server's count.
 */
export default function OwnerCounts({
  followers,
  following,
}: Readonly<{ followers: number; following: number }>) {
  const shown = useFollowingShown(following);
  const { rest } = circleCountParts({ followers, following: shown });
  return (
    <>
      <RollingCount value={shown} />
      {rest}
    </>
  );
}
