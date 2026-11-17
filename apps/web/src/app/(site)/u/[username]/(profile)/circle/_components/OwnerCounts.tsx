'use client';

import { useFollowingShown } from '../../_components/shell/followCount';
import { circleCounts } from '../../_lib/circleCopy';

/**
 * "8 following · 6 followers" on your own Circle: a Follow back (or an
 * unfollow) on a row counts at once, before the page's refresh brings the
 * server's count.
 */
export default function OwnerCounts({
  followers,
  following,
}: Readonly<{ followers: number; following: number }>) {
  const shown = useFollowingShown(following);
  return circleCounts({ followers, following: shown });
}
