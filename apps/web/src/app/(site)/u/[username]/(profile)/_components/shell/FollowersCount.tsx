'use client';

import { formatGrouped, pluralNoun } from '@tvseri.es/utils';

import RollingCount from '@/components/motion/RollingCount';

import { useFollowersShown } from './followCount';

/**
 * "6 followers · 8 following", counting a follow made here at once: the
 * followers roll to it (`RollingCount`), as the episodes beside them do
 */
export default function FollowersCount({
  followers,
  following,
  userId,
}: Readonly<{ followers: number; following: number; userId: string }>) {
  const shown = useFollowersShown(userId, followers);
  const noun = pluralNoun(shown, 'follower');
  return (
    <>
      <RollingCount value={shown} />
      {` ${noun} · ${formatGrouped(following)} following`}
    </>
  );
}
