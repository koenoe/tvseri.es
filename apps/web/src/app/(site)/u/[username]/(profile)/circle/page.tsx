import type { Metadata } from 'next';
import { isUnavailable } from '@/lib/cache/unavailable';
import { readProfileCounts } from '@/lib/profile/counts';

import Hole from '../_components/blocks/Hole';
import SubpageHeader, {
  SUBPAGE_TITLE_ID,
} from '../_components/subpage/SubpageHeader';
import {
  getProfile,
  type Profile,
  type ProfileParams,
  profileMetadata,
} from '../_data/profile';
import CircleSkeleton from './_components/CircleSkeleton';
import OwnerCircle from './_components/OwnerCircle';
import OwnerCounts from './_components/OwnerCounts';
import { PAGE, VISITOR_HEAD } from './_components/rowBoxes';
import VisitorCircle from './_components/VisitorCircle';
import { loadCirclePeople, loadVisitorCircle } from './_data/people';
import { CIRCLE_COPY, circleCounts, visitorCopy } from './_lib/circleCopy';

type Props = Readonly<{ params: ProfileParams }>;

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return profileMetadata(params, (username) => `@${username}’s circle`);
}

/**
 * Circle: your follows ranked by taste
 * match and who to follow back; on someone else's profile, who they follow
 * and who follows them. The page streams in one hole over its exact
 * placeholder; the phone frame draws no header.
 */
export default function CirclePage({ params }: Props) {
  return (
    <section aria-labelledby={SUBPAGE_TITLE_ID}>
      <Hole bare fallback={<CircleSkeleton />} title="Circle">
        <Circle params={params} />
      </Hole>
    </section>
  );
}

async function Circle({ params }: Props) {
  const profile = await getProfile(params);
  return profile.viewer === 'owner' ? (
    <OwnerPage profile={profile} />
  ) : (
    <VisitorPage profile={profile} />
  );
}

async function OwnerPage({ profile }: Readonly<{ profile: Profile }>) {
  const people = await loadCirclePeople(profile);
  const count = (
    <OwnerCounts
      followers={people.followerCount}
      following={people.followingCount}
    />
  );
  // following nobody: no "closest taste first" line, and
  // the sidebar drops the match key (`FOLLOWS_NOBODY`)
  const nobody = people.following.length === 0;
  const description = nobody ? undefined : CIRCLE_COPY.ownerDescription;
  return (
    <div className={PAGE} data-slot="circle">
      {nobody ? <span data-follows-nobody hidden /> : null}
      <SubpageHeader
        className="max-md:hidden"
        count={count}
        description={description}
        title="Circle"
      />
      <OwnerCircle people={people} />
    </div>
  );
}

async function VisitorPage({ profile }: Readonly<{ profile: Profile }>) {
  const { username } = profile.user;
  const [lists, counts] = await Promise.all([
    loadVisitorCircle(profile),
    readProfileCounts(profile.user.id),
  ]);
  // the counts are a nicety beside the lists: without them the titles go bare
  const known = isUnavailable(counts) ? null : counts;
  const copy = visitorCopy(username);
  return (
    <div className={PAGE} data-slot="circle">
      <SubpageHeader
        className="max-md:hidden"
        count={known ? circleCounts(known) : undefined}
        description={copy.description}
        slot={VISITOR_HEAD}
        title={copy.title}
      />
      <VisitorCircle counts={known} lists={lists} username={username} />
    </div>
  );
}
