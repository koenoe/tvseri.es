import type { CatchingUpItem, UpNextItem } from '@tvseri.es/schemas';

import {
  FLAT,
  Ghost,
  ghostCircle,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import { completeGlyph } from '@/components/ui/icon/glyphs';
import MetaRow from '@/components/ui/meta/MetaRow';
import cn from '@/lib/cn';

import { loadOverview } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import { isDayZero } from '../../_lib/dayZero';
import EmptyState from '../blocks/EmptyState';
import LaneGhost, { GhostRows, ShowAllGhost } from '../blocks/LaneGhost';
import { LANE_CAPS } from '../blocks/laneCaps';
import CatchingUpLane from './catching-up/CatchingUpLane';
import {
  CATCHING_UP_HEAD,
  CATCHING_UP_POSTER,
  CATCHING_UP_ROW,
  CATCHING_UP_TEXT,
  CATCHING_UP_TITLE,
  CHIP,
  RUN_CLASS,
  RUN_LINE_CLASS,
} from './catching-up/runLayout';

/**
 * Catching up: shows with three or more aired episodes waiting, marked up to
 * any chip with one click, and the premiere runway when the next season has
 * a date. Owner only. The lane follows the viewer's marks
 * (`CatchingUpLane`): a row folds out once caught up, and the empty state
 * rises in after the last, so the server draws it either way.
 */
export default async function CatchingUp({
  profile,
}: Readonly<{ profile: Profile }>) {
  const overview = await loadOverview(profile);
  const dayZero = isDayZero(overview);
  const empty = (
    <EmptyState
      glyph={completeGlyph}
      sub={
        dayZero
          ? 'Series where a few episodes stacked up.'
          : 'No episodes are piling up.'
      }
      title={dayZero ? 'Nothing piling up' : 'All caught up'}
    />
  );
  const rows = overview.catchingUp.map((item) => ({
    item,
    nextUp: nextUpLabel(item, overview.upNext),
  }));
  return <CatchingUpLane empty={empty} rows={rows} />;
}

/** "S05E05 The Last Supper, Part 1": the title when Up next has it */
function nextUpLabel(
  item: CatchingUpItem,
  upNext: ReadonlyArray<UpNextItem>,
): string {
  const title = upNext.find(
    (candidate) =>
      candidate.seriesId === item.seriesId && candidate.code === item.nextUp,
  )?.episodeTitle;
  return title ? `${item.nextUp} ${title}` : item.nextUp;
}

/** A typical run: four episode chips, the rule and the next season's chip */
const CHIPS = Array.from({ length: 4 }, (_, n) => n);

const CHIP_GHOST = cn(CHIP, FLAT);
const POSTER_GHOST = cn('shrink-0', CATCHING_UP_POSTER);

function CatchingUpRowGhost() {
  const remote = ghostCircle();
  return (
    <div className={CATCHING_UP_ROW}>
      <Ghost className={POSTER_GHOST} />
      <div className={CATCHING_UP_TEXT}>
        <div className={CATCHING_UP_HEAD}>
          <div className={CATCHING_UP_TITLE}>
            <TextLine className="text-body" width="w-32" />
            <MetaRow fit="drop">
              <TextLine className="text-meta" width="w-40" />
            </MetaRow>
          </div>
          <span className={remote} />
        </div>
        <div className={RUN_CLASS}>
          <div className={RUN_LINE_CLASS}>
            <span className="flex min-w-0 gap-1.5">
              {CHIPS.map((n) => (
                <span className={CHIP_GHOST} key={n} />
              ))}
            </span>
            <Ghost className="h-4 w-0.5 shrink-0 rounded-[1px]" />
            <span className={CHIP_GHOST} />
          </div>
          <TextLine className="text-caption" width="w-48" />
        </div>
        <MetaRow fit="drop">
          <TextLine className="text-meta" width="w-44" />
        </MetaRow>
      </div>
    </div>
  );
}

/** Catching up's placeholder: the capped lane (one show and Show all) */
export function CatchingUpSkeleton() {
  return (
    <LaneGhost title="Catching up">
      <GhostRows className="flex flex-col gap-3.5" count={LANE_CAPS.catchingUp}>
        <CatchingUpRowGhost />
      </GhostRows>
      <ShowAllGhost />
    </LaneGhost>
  );
}
