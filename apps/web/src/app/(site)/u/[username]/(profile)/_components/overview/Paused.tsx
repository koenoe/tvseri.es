import CodeBadge from '@/components/ui/button/CodeBadge';
import {
  ButtonFace,
  FLAT,
  Ghost,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import MetaRow from '@/components/ui/meta/MetaRow';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { loadOverview } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import { isDayZero } from '../../_lib/dayZero';
import LaneGhost, {
  GhostRows,
  LinkGhost,
  ShowAllGhost,
} from '../blocks/LaneGhost';
import { LANE_CAPS } from '../blocks/laneCaps';
import PausedLane from './paused/PausedLane';
import {
  PAUSED_ACTIONS,
  PAUSED_BUTTON,
  PAUSED_META,
  PAUSED_POSTER,
  PAUSED_QUESTION,
  PAUSED_QUESTION_CLASS,
  PAUSED_ROW,
  PAUSED_TITLE,
} from './paused/pausedLayout';

const POSTER = cn('row-span-2 shrink-0', PAUSED_POSTER);
/** The title's line box, a bar in it */
const TITLE = cn(PAUSED_TITLE, 'flex');

import { lastWatchedLine } from './paused/pausedCopy';

/**
 * Paused: in-progress shows not watched for over 3 months, with
 * one honest question. Keep or Hide keeps In progress true.
 */
export default async function Paused({
  profile,
}: Readonly<{ profile: Profile }>) {
  const overview = await loadOverview(profile);
  const now = Date.now();
  const rows = overview.paused.map((item) => ({
    code: item.lastWatchedCode,
    lastWatched: lastWatchedLine(item, now),
    posterImage: item.posterImage,
    seriesId: item.seriesId,
    slug: item.slug,
    title: item.title,
  }));
  const emptyLine = isDayZero(overview)
    ? 'Series you haven’t touched in 3 months.'
    : 'You finish what you start.';
  return <PausedLane emptyLine={emptyLine} rows={rows} />;
}

const ROW_GHOST = cn(PAUSED_ROW, GHOST_FILL);

function PausedRowGhost() {
  return (
    <div className={ROW_GHOST}>
      <Ghost className={POSTER} />
      <TextLine className={TITLE} width="w-28" />
      <span className={PAUSED_META}>
        <MetaRow className="h-[22px] flex-1 gap-2.5" fit="drop">
          <CodeBadge className={FLAT} size="meta" />
          <TextLine className="text-meta" width="w-28" />
        </MetaRow>
      </span>
      <span className={PAUSED_ACTIONS}>
        <ButtonFace className={PAUSED_BUTTON} variant="outline">
          Keep
        </ButtonFace>
        <ButtonFace className={PAUSED_BUTTON} variant="outline">
          Hide
        </ButtonFace>
      </span>
    </div>
  );
}

/** Paused's placeholder: the capped lane (three rows and Show all) */
export function PausedSkeleton() {
  const link = <LinkGhost width="w-14" />;
  return (
    <LaneGhost link={link} title="Paused">
      <p className={PAUSED_QUESTION_CLASS}>{PAUSED_QUESTION}</p>
      <GhostRows className="flex flex-col gap-2.5" count={LANE_CAPS.paused}>
        <PausedRowGhost />
      </GhostRows>
      <ShowAllGhost />
    </LaneGhost>
  );
}
