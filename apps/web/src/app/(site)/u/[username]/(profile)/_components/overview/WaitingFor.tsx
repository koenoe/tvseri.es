import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { variantHourglassGlyph } from '@/components/ui/icon/glyphs';
import { libraryPath } from '@/lib/routing/profilePath';
import { loadOverview, loadWaitingFor } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import { isDayZero } from '../../_lib/dayZero';
import CappedRows from '../blocks/CappedRows';
import EmptyState from '../blocks/EmptyState';
import HeadLink from '../blocks/HeadLink';
import Lane from '../blocks/Lane';
import LaneGhost, {
  GhostRows,
  LANE_ROW_GHOST,
  LinkGhost,
  ShowAllGhost,
} from '../blocks/LaneGhost';
import { LANE_CAPS } from '../blocks/laneCaps';
import WaitRow, { WAIT_TEXT, WAIT_TITLE_LINE } from './waiting-for/WaitRow';

/**
 * Waiting for: the shows you finished that are coming back, and
 * when. 30 days out a return moves to Coming up. Owner only.
 */
export default async function WaitingFor({
  profile,
}: Readonly<{ profile: Profile }>) {
  const [data, overview] = await Promise.all([
    loadWaitingFor(profile),
    loadOverview(profile),
  ]);
  const now = Date.now();
  const finishedHref = libraryPath(profile.user.username, 'finished');
  const link = <HeadLink href={finishedHref}>All finished</HeadLink>;
  if (data.items.length === 0) {
    // No dead ends: day one has no "All finished"
    const head = isDayZero(overview) ? null : link;
    return (
      <Lane dot="pink" hollow id="b-wf" link={head} title="Waiting for">
        <EmptyState
          glyph={variantHourglassGlyph}
          sub="Finished series that return, and when."
          title="Nothing to wait for"
        />
      </Lane>
    );
  }
  const rows = data.items.map((item) => (
    <WaitRow item={item} key={item.seriesId} now={now} />
  ));
  return (
    <Lane
      count={data.items.length}
      dot="pink"
      id="b-wf"
      link={link}
      title="Waiting for"
    >
      <CappedRows
        cap={LANE_CAPS.waitingFor}
        className="flex flex-col gap-2.5"
        equalRows
        rows={rows}
      />
    </Lane>
  );
}

function WaitRowGhost() {
  return (
    <div className={LANE_ROW_GHOST}>
      <Ghost className="h-[60px] w-10 shrink-0 rounded-6" />
      <span className={WAIT_TEXT}>
        <span className={WAIT_TITLE_LINE}>
          <TextLine className="text-body-sm" width="w-28" />
          <TextLine className="text-caption max-md:hidden" width="w-16" />
        </span>
        <Ghost className="h-1 rounded-2" />
        <span className="flex h-5 items-center justify-between gap-2.5">
          <TextLine className="text-caption" width="w-24" />
          <TextLine className="text-caption" width="w-28" />
        </span>
      </span>
    </div>
  );
}

/** Waiting for's placeholder: the capped lane (three rows and Show all) */
export function WaitingForSkeleton() {
  const link = <LinkGhost width="w-24" />;
  return (
    <LaneGhost link={link} title="Waiting for">
      <GhostRows className="flex flex-col gap-2.5" count={LANE_CAPS.waitingFor}>
        <WaitRowGhost />
      </GhostRows>
      <ShowAllGhost />
    </LaneGhost>
  );
}
