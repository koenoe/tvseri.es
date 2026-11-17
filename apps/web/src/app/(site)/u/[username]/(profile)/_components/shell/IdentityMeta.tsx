import { Ghost, PULSE } from '@/components/ui/ghost/ghosts';
import { eyeGlyph, usersGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import {
  IdentityLine,
  IdentityLinkLine,
} from '@/components/ui/identity/IdentityLines';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import { isUnavailable } from '@/lib/cache/unavailable';
import type { ProfileCounts } from '@/lib/profile/counts';
import { readProfileCounts } from '@/lib/profile/counts';
import profilePath from '@/lib/routing/profilePath';
import { loadFollowState } from '../../_data/follow';
import type { Profile } from '../../_data/profile';
import EpisodesCount from './EpisodesCount';
import FinishedCount from './FinishedCount';
import FollowersCount from './FollowersCount';

const LINES = 'flex flex-col gap-3';

/** The two count lines before they load (one 17px line each) */
export function IdentityMetaSkeleton() {
  return (
    <div aria-hidden="true" className={`${LINES} ${PULSE}`}>
      <Ghost className="h-[17px] w-52 rounded-4" />
      <Ghost className="h-[17px] w-48 rounded-4" />
    </div>
  );
}

/** The compact identity's count line before it loads (one 20px line) */
export function CompactMetaSkeleton() {
  return (
    <span aria-hidden="true" className={`flex h-5 items-center ${PULSE}`}>
      <span className={`h-[13px] w-48 rounded-4 ${GHOST_FILL}`} />
    </span>
  );
}

/** The class of Hole's content box around these lines */
export const IDENTITY_META_CLASS = LINES;

/**
 * The identity's count lines: "5,341 episodes, 218 finished" and
 * "6 followers · 8 following" with "Follows you". Counts that did not load
 * keep their lines and say so, so the sidebar never goes down with a read.
 */
export default async function IdentityMeta({
  profile,
}: Readonly<{ profile: Profile }>) {
  const [counts, follow] = await Promise.all([
    readProfileCounts(profile.user.id),
    loadFollowState(profile),
  ]);
  const known = isUnavailable(counts) ? null : counts;
  const followsYou = !isUnavailable(follow) && follow.followsYou;
  const circleHref = profilePath(profile.user.username, 'circle');
  return (
    <>
      <IdentityLine glyph={eyeGlyph}>
        {episodesLine(known, ', ', profile.user.username)}
      </IdentityLine>
      <IdentityLinkLine glyph={usersGlyph} href={circleHref}>
        {known === null ? (
          'Followers and following'
        ) : (
          <FollowersCount
            followers={known.followers}
            following={known.following}
            userId={profile.user.id}
          />
        )}
        {followsYou ? <FollowsYou /> : null}
      </IdentityLinkLine>
    </>
  );
}

/** "5,341 episodes, 218 finished" (the compact identity joins them with " · ") */
function episodesLine(
  known: ProfileCounts | null,
  separator: string,
  username: string,
) {
  if (known === null) {
    return 'Counts unavailable right now';
  }
  return known.episodes === 0 ? (
    'No episodes yet'
  ) : (
    <>
      <EpisodesCount episodes={known.episodes} username={username} />
      {separator}
      <FinishedCount finished={known.finished} username={username} />
    </>
  );
}

/**
 * The compact identity's one count line: "5,341
 * episodes · 218 finished", 13px, the eye at 13px
 */
export async function CompactIdentityMeta({
  profile,
}: Readonly<{ profile: Profile }>) {
  const counts = await readProfileCounts(profile.user.id);
  return (
    <span className="flex min-w-0 items-center gap-2 text-[13px] leading-5 whitespace-nowrap text-white/60">
      <Icon className="size-[13px] shrink-0" glyph={eyeGlyph} size={13} />
      <span className="truncate">
        {episodesLine(
          isUnavailable(counts) ? null : counts,
          ' · ',
          profile.user.username,
        )}
      </span>
    </span>
  );
}

/** "Follows you" (a follow is mutual) */
function FollowsYou() {
  return (
    <span className="ml-1 inline-flex shrink-0 items-center rounded-[5px] bg-black/10 px-[7px] py-0.5 text-[10px] font-medium whitespace-nowrap text-white/60">
      Follows you
    </span>
  );
}
