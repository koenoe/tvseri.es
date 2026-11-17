import { visitorCopy } from '../../_lib/circleCopy';
import type { VisitorCircle as Lists } from '../_data/people';
import CircleSection from './CircleSection';
import VisitorList from './VisitorList';

/**
 * Someone else's Circle under the page title: who they
 * follow and who follows them, as calm rows with your relation, what each
 * is watching and Follow. No rings: a ring is your match with that person,
 * and it lives on their profile.
 */
export default function VisitorCircle({
  counts,
  lists,
  username,
}: Readonly<{
  /** The profile's counters; unknown when they didn't load */
  counts: Readonly<{ followers: number; following: number }> | null;
  lists: Lists;
  username: string;
}>) {
  const copy = visitorCopy(username);
  const base = `/api/u/${encodeURIComponent(username)}/social`;
  return (
    <div className="flex flex-col gap-8">
      <CircleSection
        count={counts?.following}
        id="circle-following"
        title={copy.following}
      >
        <VisitorList
          empty={copy.followingEmpty}
          endpoint={`${base}/following`}
          first={lists.following}
          marksFirst
        />
      </CircleSection>
      <CircleSection
        count={counts?.followers}
        id="circle-followers"
        title={copy.followers}
      >
        <VisitorList
          empty={copy.followersEmpty}
          endpoint={`${base}/followers`}
          first={lists.followers}
        />
      </CircleSection>
    </div>
  );
}
