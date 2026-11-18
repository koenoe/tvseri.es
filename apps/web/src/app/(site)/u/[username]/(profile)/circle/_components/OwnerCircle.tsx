import type { CirclePeople } from '@tvseri.es/schemas';

import { usersGlyph } from '@/components/ui/icon/glyphs';
import EmptyState from '../../_components/blocks/EmptyState';
import { CIRCLE_COPY, followNobodyLine } from '../../_lib/circleCopy';
import CircleSection from './CircleSection';
import OwnerPersonRow from './OwnerPersonRow';
import { LIST } from './rowBoxes';

const FOLLOWING_LIST = `${LIST} mt-4 md:mt-5`;
const FOLLOWERS_LIST = `${LIST} mt-4`;

/**
 * Your own Circle under the page title: the people you follow, closest
 * taste first, then those who follow you that you don't follow back.
 * Following nobody is one calm card; with nobody to follow back that
 * section goes (no dead ends).
 */
export default function OwnerCircle({
  people,
}: Readonly<{ people: CirclePeople }>) {
  const { capped, followers, following, followingCount } = people;
  const followNobodySub = followNobodyLine(followers.length);
  return (
    <div className="flex flex-col gap-8">
      <CircleSection
        count={followingCount}
        id="circle-following"
        title={CIRCLE_COPY.following}
      >
        {following.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              glyph={usersGlyph}
              sub={followNobodySub}
              title={CIRCLE_COPY.followNobody}
            />
          </div>
        ) : (
          <ul className={FOLLOWING_LIST}>
            {following.map((row, index) => {
              const first = index === 0;
              return <OwnerPersonRow first={first} key={row.id} row={row} />;
            })}
          </ul>
        )}
      </CircleSection>
      {followers.length > 0 ? (
        <CircleSection
          count={followers.length}
          id="circle-followers"
          title={CIRCLE_COPY.followsYou}
        >
          <ul className={FOLLOWERS_LIST}>
            {followers.map((row, index) => {
              const first = index === 0 && following.length === 0;
              return <OwnerPersonRow first={first} key={row.id} row={row} />;
            })}
          </ul>
        </CircleSection>
      ) : null}
      {capped ? (
        <p className="m-0 -mt-4 text-meta text-white/60">
          {CIRCLE_COPY.capped}
        </p>
      ) : null}
    </div>
  );
}
