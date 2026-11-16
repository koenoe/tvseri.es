import { PULSE } from '@/components/ui/ghost/ghosts';
import { userPlusGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import { isUnavailable } from '@/lib/cache/unavailable';

import { loadFollowState } from '../../_data/follow';
import type { Profile } from '../../_data/profile';
import EditProfileLink from './EditProfileLink';
import FollowButton from './FollowButton';

type Size = 'sidebar' | 'compact';

const SKELETON: Readonly<Record<Size, string>> = {
  compact: `block h-8 w-[74px] shrink-0 rounded-full ${GHOST_FILL} ${PULSE}`,
  sidebar: `block h-[42px] w-full rounded-10 ${GHOST_FILL} ${PULSE}`,
};

/** The button's place before the follow state is known: 42px wide, or the compact 32px pill */
export function ProfileActionSkeleton({
  size = 'sidebar',
}: Readonly<{ size?: Size }>) {
  return <span aria-hidden="true" className={SKELETON[size]} />;
}

const UNAVAILABLE: Readonly<Record<Size, string>> = {
  compact: 'h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold',
  sidebar: 'h-[42px] w-full rounded-10 px-4 text-[14px] font-medium',
};

/**
 * The owner's Edit profile, or a visitor's Follow / Following. When
 * the follow state did not load the button is off and says why: a guess
 * could show Follow for someone you already follow.
 */
export default async function ProfileAction({
  profile,
  size = 'sidebar',
}: Readonly<{ profile: Profile; size?: Size }>) {
  if (profile.viewer === 'owner') {
    return <EditProfileLink size={size} />;
  }
  const follow = await loadFollowState(profile);
  if (isUnavailable(follow)) {
    // contrast-exempt: a disabled action
    const className = `flex cursor-not-allowed items-center justify-center gap-2 border-2 border-white/15 whitespace-nowrap text-white/40 ${UNAVAILABLE[size]}`;
    return (
      <button
        aria-label="Follow, unavailable right now"
        className={className}
        disabled
        title="Couldn’t check whether you follow them. Reload to try again."
        type="button"
      >
        <Icon className="size-[15px]" glyph={userPlusGlyph} size={13} />
        Follow
      </button>
    );
  }
  return (
    <FollowButton
      initialFollowing={follow.following}
      size={size}
      userId={profile.user.id}
      username={profile.user.username}
    />
  );
}
