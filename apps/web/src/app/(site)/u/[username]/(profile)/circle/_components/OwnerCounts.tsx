'use client';

import { plural } from '@tvseri.es/utils';

import RollingCount from '@/components/motion/RollingCount';

import { useFollowingShown } from '../../_components/shell/followCount';

/**
 * "8 following · 6 followers" on your own Circle (a visitor's is
 * `circleCounts`): a Follow back (or an unfollow) on a row counts at once,
 * the number rolling to it (`RollingCount`), before the page's refresh
 * brings the server's count.
 */
export default function OwnerCounts({
  followers,
  following,
}: Readonly<{ followers: number; following: number }>) {
  const shown = useFollowingShown(following);
  return (
    <>
      <RollingCount value={shown} />
      {` following · ${plural(followers, 'follower')}`}
    </>
  );
}
