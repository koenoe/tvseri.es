'use client';

import { plural } from '@/lib/format/text';
import { formatGrouped } from '@/lib/formatCount';
import { useFollowersShown } from './followCount';

/** "6 followers · 8 following", counting a follow made here at once */
export default function FollowersCount({
  followers,
  following,
  userId,
}: Readonly<{ followers: number; following: number; userId: string }>) {
  const shown = useFollowersShown(userId, followers);
  return (
    <>{`${plural(shown, 'follower')} · ${formatGrouped(following)} following`}</>
  );
}
