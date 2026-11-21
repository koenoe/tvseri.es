import LaneRowGhost from '@/components/lane-row/LaneRowGhost';
import { Ghost, ghostCircle, TextLine } from '@/components/ui/ghost/ghosts';
import { flagGlyph } from '@/components/ui/icon/glyphs';
import { libraryPath } from '@/lib/routing/profilePath';
import { loadOverview } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import { isDayZero } from '../../_lib/dayZero';
import CappedRows from '../blocks/CappedRows';
import EmptyState from '../blocks/EmptyState';
import HeadLink from '../blocks/HeadLink';
import Lane from '../blocks/Lane';
import LaneGhost, {
  GhostRows,
  LinkGhost,
  ShowAllGhost,
} from '../blocks/LaneGhost';
import { LANE_CAPS } from '../blocks/laneCaps';
import AlmostDoneRow from './almost-done/AlmostDoneRow';
import { closestLabel } from './almost-done/almostDoneCopy';
import {
  ALMOST_DONE_POSTER,
  ALMOST_DONE_ROW,
  ALMOST_DONE_ROW_GHOST,
} from './almost-done/almostDoneLayout';

/**
 * Almost done: seasons one or two episodes from their end, with the
 * time it takes and one tap on the eye. Empty names the closest show once
 * there is one, and describes itself on day 0.
 */
export default async function AlmostDone({
  profile,
}: Readonly<{ profile: Profile }>) {
  const overview = await loadOverview(profile);
  const { closest, items } = overview.almostDone;
  const dayZero = isDayZero(overview);
  const href = libraryPath(profile.user.username, 'watching');
  // No dead ends: no link while the Watching shelf would be empty
  const link =
    overview.upNext.length === 0 ? null : (
      <HeadLink href={href}>All in progress</HeadLink>
    );

  if (items.length === 0) {
    const sub = closest ? (
      <>
        Closest is{' '}
        <b className="font-semibold text-white/80">{closest.title}</b>,{' '}
        {closestLabel(closest.toGo)}.
      </>
    ) : (
      'Seasons with an episode or two to go.'
    );
    return (
      <Lane dot="cyan" hollow id="almost-done" link={link} title="Almost done">
        <EmptyState
          glyph={flagGlyph}
          sub={sub}
          title={dayZero ? 'No finish line yet' : 'No finish line in sight'}
        />
      </Lane>
    );
  }

  const ids = items.map((item) => item.seriesId);
  const rows = items.map((item) => (
    <AlmostDoneRow item={item} key={item.seriesId} />
  ));
  return (
    <Lane
      count={items.length}
      dot="cyan"
      id="almost-done"
      link={link}
      title="Almost done"
    >
      <CappedRows
        cap={LANE_CAPS.almostDone}
        equalRows
        gap="2.5"
        ids={ids}
        rows={rows}
      />
    </Lane>
  );
}

/** A row's ghosts: the poster, the title and "1 to go", the time, the eye */
const ROW_POSTER = <Ghost className={ALMOST_DONE_POSTER} />;
const ROW_TITLE = (
  <>
    <TextLine className="text-body-sm" width="w-28" />
    <TextLine className="text-caption max-md:hidden" width="w-10" />
  </>
);
const ROW_FACTS = <TextLine className="text-meta" width="w-36" />;
const EYE_CIRCLE = ghostCircle();
const ROW_EYE = <span className={EYE_CIRCLE} />;

function AlmostDoneRowGhost() {
  return (
    <LaneRowGhost
      end={ROW_EYE}
      facts={ROW_FACTS}
      ghost={ALMOST_DONE_ROW_GHOST}
      layout={ALMOST_DONE_ROW}
      poster={ROW_POSTER}
      title={ROW_TITLE}
    />
  );
}

/** Almost done's placeholder: the capped lane (two rows and Show all) */
export function AlmostDoneSkeleton() {
  const link = <LinkGhost width="w-28" />;
  return (
    <LaneGhost link={link} title="Almost done">
      <GhostRows className="flex flex-col gap-2.5" count={LANE_CAPS.almostDone}>
        <AlmostDoneRowGhost />
      </GhostRows>
      <ShowAllGhost />
    </LaneGhost>
  );
}
