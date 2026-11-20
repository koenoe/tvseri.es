'use client';

import { startTransition, useOptimistic, useState } from 'react';
import { HIT_Y } from '@/components/ui/button/hitArea';
import { userCheckGlyph, userPlusGlyph } from '@/components/ui/icon/glyphs';
import IconSwap from '@/components/ui/icon/IconSwap';
import { showToast } from '@/components/ui/toast/showToast';
import cn from '@/lib/cn';

import { setFollowing } from '../../_actions/follow';
import { recordFollow } from './followCount';

/**
 * The icon's side sits 2px closer than the text's (not in the full-width,
 * centred sidebar). The 32px pills reach 44px to the thumb.
 */
const SIZE = {
  circle: `${HIT_Y[6]} h-8 shrink-0 rounded-full pr-3 pl-2.5 text-[13px] font-semibold`,
  compact: `${HIT_Y[6]} h-8 shrink-0 rounded-full pr-3.5 pl-3 text-[13px] font-semibold`,
  sidebar: 'h-[42px] w-full rounded-10 px-[18px] text-[14px] font-medium',
} as const;

type Props = Readonly<{
  /** The label while not following: "Follow", or the Circle's "Follow back" */
  followLabel?: string;
  initialFollowing: boolean;
  /**
   * `sidebar`: Edit profile's slot (full width, 42px); `compact`: the phone
   * sub-pages' identity, Edit's 32px pill; `circle`: a Circle row's (the
   * compact 32px pill on the phone)
   */
  size?: keyof typeof SIZE;
  userId: string;
  username: string;
}>;

/**
 * The Circle's desktop pills: Following is the ghost button, Follow the
 * white one
 */
const CIRCLE = {
  follow: 'md:h-10 md:pr-[18px] md:pl-4 md:text-[14px]',
  following:
    'shadow-[inset_0_0_0_2px_rgb(255_255_255/0.2)] md:h-9 md:pr-3.5 md:pl-3',
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
    'relative flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap transition-[background-color,box-shadow,color,scale] duration-150 ease-out active:scale-96',
    SIZE[size],
    // Following's outline is a 2px inner ring: it takes no layout, so both
    // states share their padding
    following
      ? 'text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.25)] hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.5)]'
      : 'bg-white text-[#171717] hover:bg-white/88',
    circle && (following ? CIRCLE.following : CIRCLE.follow),
  );
  const busy = pending || undefined;
  const glyph = following ? userCheckGlyph : userPlusGlyph;
  const iconClass = circle ? undefined : 'size-[15px]';

  return (
    <button
      aria-busy={busy}
      className={className}
      onClick={toggle}
      type="button"
    >
      <IconSwap className={iconClass} glyph={glyph} size={circle ? 16 : 13} />
      {label}
    </button>
  );
}
