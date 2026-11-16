import type { Profile } from '../../_data/profile';
import Hole from '../blocks/Hole';
import { NOT_ON_PHONE } from '../shell/overviewLayout';
import {
  MATCH_BOX_CLASS,
  MATCH_RULE_CLASS,
} from '../shell/SidebarBlocksSkeleton';
import MatchCard, { MatchCardSkeleton } from '../visitor/MatchCard';
import StartSomethingNew, {
  StartSomethingNewSkeleton,
} from './StartSomethingNew';
import WatchlistBlock, { WatchlistBlockSkeleton } from './WatchlistBlock';
import YearSoFar, { YearSoFarSkeleton } from './YearSoFar';

const MATCH_RULE = `h-0.5 rounded-2 bg-white/8 ${MATCH_RULE_CLASS}`;

/**
 * The sidebar under the identity (`@aside`): someone else's match card and
 * a rule; nothing of your own. Streams in its own hole.
 */
export function SidebarHead({ profile }: Readonly<{ profile: Profile }>) {
  if (profile.viewer === 'owner') {
    return null;
  }
  return (
    <>
      <div className={MATCH_BOX_CLASS}>
        <Hole fallback={<MatchCardSkeleton />} title="Your match">
          <MatchCard profile={profile} />
        </Hole>
      </div>
      <span aria-hidden="true" className={MATCH_RULE} />
    </>
  );
}

/**
 * The sidebar's last blocks (`@tail`), after the page in the DOM
 * (`overviewLayout.ts`). Owner: Watchlist, Start something new (not on a
 * phone: Home has its own pick), 2026 so far. Visitor: Watchlist, their
 * year. Each block streams in its own hole.
 */
export function SidebarTail({ profile }: Readonly<{ profile: Profile }>) {
  return (
    <>
      <Hole fallback={<WatchlistBlockSkeleton />} title="Watchlist">
        <WatchlistBlock profile={profile} />
      </Hole>
      {profile.viewer === 'owner' ? (
        <div className={NOT_ON_PHONE}>
          <Hole
            fallback={<StartSomethingNewSkeleton />}
            title="Start something new"
          >
            <StartSomethingNew profile={profile} />
          </Hole>
        </div>
      ) : null}
      <Hole fallback={<YearSoFarSkeleton />} title="This year so far">
        <YearSoFar profile={profile} />
      </Hole>
    </>
  );
}
