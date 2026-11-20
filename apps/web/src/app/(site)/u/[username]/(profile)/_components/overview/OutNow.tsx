import type { Overview } from '@tvseri.es/schemas';
import LaneRowGhost from '@/components/lane-row/LaneRowGhost';
import { Ghost, ghostCircle, TextLine } from '@/components/ui/ghost/ghosts';
import { inboxGlyph } from '@/components/ui/icon/glyphs';
import { formatAirWeekdayDate } from '@/lib/format/airDate';
import { loadOverview } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import { isDayZero } from '../../_lib/dayZero';
import CappedRows from '../blocks/CappedRows';
import EmptyState from '../blocks/EmptyState';
import Lane from '../blocks/Lane';
import LaneGhost, { GhostRows, ShowAllGhost } from '../blocks/LaneGhost';
import { LANE_CAPS } from '../blocks/laneCaps';
import OutNowRow, {
  OUT_NOW_CONTROLS,
  OUT_NOW_ROW,
  OUT_NOW_ROW_GHOST,
} from './lane-rows/OutNowRow';

/** The cyan-tinted lane (quieter when empty) */
const TINT =
  'bg-[rgb(0_255_255/0.05)] shadow-[inset_0_0_0_1px_rgb(0_255_255/0.14)]';
const TINT_EMPTY =
  'bg-[rgb(0_255_255/0.025)] shadow-[inset_0_0_0_1px_rgb(0_255_255/0.08)]';

/**
 * Out now: a show's latest episode while fewer than three wait (more is
 * Catching up), and a whole season for 14 days after it completes. Owner
 * only.
 */
export default async function OutNow({
  profile,
}: Readonly<{ profile: Profile }>) {
  const overview = await loadOverview(profile);
  const items = overview.outNow;
  const ids = items.map((item) => item.seriesId);
  const now = Date.now();

  if (items.length === 0) {
    const emptySub = emptyLine(overview);
    return (
      <Lane className={TINT_EMPTY} dot="cyan" hollow id="b-out" title="Out now">
        <EmptyState glyph={inboxGlyph} sub={emptySub} title="Nothing new out" />
      </Lane>
    );
  }

  const rows = items.map((item) => {
    const releaseId = `${item.seriesId}-${item.kind}`;
    return <OutNowRow item={item} key={releaseId} now={now} />;
  });
  return (
    <Lane
      className={TINT}
      count={items.length}
      dot="cyan"
      glow
      id="b-out"
      title="Out now"
    >
      <CappedRows
        as="ul"
        cap={LANE_CAPS.outNow}
        className="px-1 pt-0.5 pb-1"
        gap="5"
        ids={ids}
        rows={rows}
      />
    </Lane>
  );
}

function emptyLine(overview: Overview) {
  const next = overview.comingUp[0];
  if (isDayZero(overview) || !next) {
    return 'New episodes of your series, the day they land.';
  }
  return (
    <>
      Next: <span className="font-medium text-white">{next.title}</span>,{' '}
      {formatAirWeekdayDate(next.date)}
    </>
  );
}

/** A row's ghosts: the poster, the title, the facts, the eye and the ⋯ */
const ROW_POSTER = (
  <Ghost className="h-[51px] w-[34px] shrink-0 rounded-[5px]" />
);
const ROW_TITLE = <TextLine className="text-body-sm" width="w-32" />;
const ROW_FACTS = <TextLine className="text-meta" width="w-24" />;
const CONTROL_CIRCLE = ghostCircle();
const ROW_CONTROLS = (
  <span className={OUT_NOW_CONTROLS}>
    <span className={CONTROL_CIRCLE} />
    <span className={CONTROL_CIRCLE} />
  </span>
);

function OutNowRowGhost() {
  return (
    <LaneRowGhost
      end={ROW_CONTROLS}
      facts={ROW_FACTS}
      ghost={OUT_NOW_ROW_GHOST}
      layout={OUT_NOW_ROW}
      poster={ROW_POSTER}
      title={ROW_TITLE}
    />
  );
}

/** Out now's placeholder: the capped lane (two rows and Show all), untinted */
export function OutNowSkeleton() {
  return (
    <LaneGhost title="Out now">
      <GhostRows
        className="flex flex-col gap-5 px-1 pt-0.5 pb-1"
        count={LANE_CAPS.outNow}
      >
        <OutNowRowGhost />
      </GhostRows>
      <ShowAllGhost />
    </LaneGhost>
  );
}
