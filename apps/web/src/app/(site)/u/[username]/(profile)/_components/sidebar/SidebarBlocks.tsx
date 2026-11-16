import type { Profile } from '../../_data/profile';
import Hole from '../blocks/Hole';
import { MATCH_RULE_CLASS } from '../shell/SidebarBlocksSkeleton';
import MatchCard, { MatchCardSkeleton } from '../visitor/MatchCard';
import StartSomethingNew, {
  StartSomethingNewSkeleton,
} from './StartSomethingNew';
import WatchlistBlock, { WatchlistBlockSkeleton } from './WatchlistBlock';
import YearSoFar, { YearSoFarSkeleton } from './YearSoFar';

const MATCH_RULE = `h-0.5 rounded-2 bg-white/8 ${MATCH_RULE_CLASS}`;

/**
 * The sidebar under the identity. Owner: Watchlist, Start something
 * new, 2026 so far. Visitor: the match card, a rule, Watchlist, then
 * their year; no Start something new. Each block streams in its own hole.
 */
export default function SidebarBlocks({
  profile,
}: Readonly<{ profile: Profile }>) {
  const owner = profile.viewer === 'owner';
  return (
    <>
      {owner ? null : (
        <>
          <Hole fallback={<MatchCardSkeleton />} title="Your match">
            <MatchCard profile={profile} />
          </Hole>
          <span aria-hidden="true" className={MATCH_RULE} />
        </>
      )}
      <Hole fallback={<WatchlistBlockSkeleton />} title="Watchlist">
        <WatchlistBlock profile={profile} />
      </Hole>
      {owner ? (
        <Hole
          fallback={<StartSomethingNewSkeleton />}
          title="Start something new"
        >
          <StartSomethingNew profile={profile} />
        </Hole>
      ) : null}
      <Hole fallback={<YearSoFarSkeleton />} title="This year so far">
        <YearSoFar profile={profile} />
      </Hole>
    </>
  );
}
