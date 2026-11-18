'use client';

import { startTransition, useOptimistic, useState } from 'react';
import { userCheckGlyph, userPlusGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { showToast } from '@/components/ui/toast/showToast';
import cn from '@/lib/cn';

import { setFollowing } from '../../_actions/follow';
import { recordFollow } from './followCount';

const SIZE = {
  circle: 'h-8 shrink-0 rounded-full px-2.5 text-[13px] font-semibold',
  compact: 'h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold',
  row: 'h-9 shrink-0 rounded-full px-4 text-[14px] font-medium',
  sidebar: 'h-[42px] w-full rounded-10 px-4 text-[14px] font-medium',
} as const;

type Props = Readonly<{
  /** The label while not following: "Follow", or the Circle's "Follow back" */
  followLabel?: string;
  initialFollowing: boolean;
  /**
   * `sidebar`: Edit profile's slot (full width, 42px); `row`: a 36px pill;
   * `compact`: the phone sub-pages' identity, Edit's 32px pill; `circle`: a
   * Circle row's (the compact 32px pill on the phone)
   */
  size?: keyof typeof SIZE;
  userId: string;
  username: string;
}>;

/**
 * The Circle's desktop pills: Following is the ghost button, Follow the
 * white one. The ring is the 2px border, so each padding is 2px less than
 * it would be without it.
 */
const CIRCLE = {
  follow: 'md:h-10 md:px-4 md:text-[14px]',
  following: 'border-white/20 md:h-9 md:px-3',
} as const;

/**
 * Follow / Following in Edit profile's slot: same size and corners; not
 * following is the white primary button, following the outline. Flips in
 * the same frame (`useOptimistic`), keeps the answer the API confirmed
 * (Circle rows past the first page are client-loaded, so no server render
 * would update them), and rolls back with a dark toast when the API says
 * no. The followers line counts a confirmed follow at once
 * (`recordFollow`): the API's counter follows from its stream a moment
 * later, after the action's refresh.
 */
export default function FollowButton({
  followLabel = 'Follow',
  initialFollowing,
  size = 'sidebar',
  userId,
  username,
}: Props) {
  const [confirmed, setConfirmed] = useState(initialFollowing);
  // A new server render (after the refresh) is the truth again
  const [seed, setSeed] = useState(initialFollowing);
  if (seed !== initialFollowing) {
    setSeed(initialFollowing);
    setConfirmed(initialFollowing);
  }
  const [following, setOptimistic] = useOptimistic(confirmed);
  const [pending, setPending] = useOptimistic(false);

  const toggle = () => {
    const next = !following;
    startTransition(async () => {
      setOptimistic(next);
      setPending(true);
      const result = await setFollowing(userId, next);
      if (result.ok) {
        recordFollow(userId, next ? 1 : -1);
        startTransition(() => setConfirmed(next));
        return;
      }
      showToast({
        title: next
          ? `Couldn't follow ${username}. Try again.`
          : `Couldn't unfollow ${username}. Try again.`,
        tone: 'error',
      });
    });
  };

  const circle = size === 'circle';
  const label = following ? 'Following' : followLabel;
  const className = cn(
    'flex cursor-pointer items-center justify-center gap-2 border-2 whitespace-nowrap transition-[background-color,border-color,color] duration-200',
    SIZE[size],
    following
      ? 'border-white/25 text-white hover:border-white/50'
      : 'border-white bg-white text-[#171717] hover:bg-white/88',
    circle && (following ? CIRCLE.following : CIRCLE.follow),
  );
  const busy = pending || undefined;

  return (
    <button
      aria-busy={busy}
      className={className}
      onClick={toggle}
      type="button"
    >
      <Icon
        className={circle ? undefined : 'size-[15px]'}
        glyph={following ? userCheckGlyph : userPlusGlyph}
        size={circle ? 16 : 13}
      />
      {label}
    </button>
  );
}
