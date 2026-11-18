import type { ReactNode } from 'react';

import { calendarGlyph } from '@/components/ui/icon/glyphs';
import Handle from '@/components/ui/identity/Handle';
import {
  IdentityLine,
  IdentityLines,
} from '@/components/ui/identity/IdentityLines';
import WatchesOn from '@/components/ui/identity/WatchesOn';
import { memberSince } from '@/lib/profile/memberSince';
import type { Profile } from '../../_data/profile';
import Hole from '../blocks/Hole';
import IdentityMeta, {
  CompactIdentityMeta,
  CompactMetaSkeleton,
  IDENTITY_META_CLASS,
  IdentityMetaSkeleton,
} from './IdentityMeta';
import ProfileAction, { ProfileActionSkeleton } from './ProfileAction';
import { COMPACT_IDENTITY_CLASS, FULL_IDENTITY_CLASS } from './subpage';

/**
 * The identity at the top of the sidebar, in two variants (only one shows):
 *
 * - the full block: the handle, three meta lines grouped without a box, the
 *   services, and the owner's or visitor's button, the same on every page
 *   it shows on;
 * - the compact one, on a phone's sub-pages: the handle up to 32px and
 *   "5,341 episodes · 218 finished" beside a small Edit, or a visitor's
 *   Follow / Following in its slot.
 *
 * Each read in it (the counters, the follow state) sits in its own hole, so
 * a failed read fails only its line or its button.
 */
export default function Identity({
  profile,
}: Readonly<{ profile: Profile }>): ReactNode {
  const { user } = profile;
  const joined = memberSince(user.createdAt, Date.now());
  const isOwner = profile.viewer === 'owner';
  return (
    <>
      <section aria-label="Identity" className={FULL_IDENTITY_CLASS}>
        <Handle username={user.username} />
        <IdentityLines>
          {joined ? (
            <IdentityLine glyph={calendarGlyph}>
              Member since {joined}
            </IdentityLine>
          ) : null}
          <Hole
            className={IDENTITY_META_CLASS}
            fallback={<IdentityMetaSkeleton />}
            look="line"
            title="Counts"
          >
            <IdentityMeta profile={profile} />
          </Hole>
        </IdentityLines>
        <WatchesOn isOwner={isOwner} providers={user.watchProviders} />
        <Hole fallback={<ProfileActionSkeleton />} look="line" title="Follow">
          <ProfileAction profile={profile} />
        </Hole>
      </section>
      <section aria-label="Identity" className={COMPACT_IDENTITY_CLASS}>
        {/* the handle fits this column (`@container`), beside the button */}
        <div className="@container flex min-w-0 flex-1 flex-col gap-2">
          <Handle size="compact" username={user.username} />
          <Hole
            fallback={<CompactMetaSkeleton />}
            look="line"
            title="Compact counts"
          >
            <CompactIdentityMeta profile={profile} />
          </Hole>
        </div>
        <Hole
          fallback={<ProfileActionSkeleton size="compact" />}
          look="line"
          title="Compact follow"
        >
          <ProfileAction profile={profile} size="compact" />
        </Hole>
      </section>
    </>
  );
}
