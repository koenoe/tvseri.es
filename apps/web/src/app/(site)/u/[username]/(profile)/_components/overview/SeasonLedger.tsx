import CodeBadge from '@/components/ui/button/CodeBadge';
import {
  ButtonFace,
  FLAT,
  Ghost,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import { seasonGlyph } from '@/components/ui/icon/glyphs';
import MetaRow from '@/components/ui/meta/MetaRow';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { loadOverview } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import { isDayZero } from '../../_lib/dayZero';
import EmptyState from '../blocks/EmptyState';
import Lane from '../blocks/Lane';
import LaneGhost, { LinkGhost } from '../blocks/LaneGhost';
import LedgerLane from './season-ledger/LedgerLane';
import {
  LEDGER_BUTTON,
  LEDGER_BUTTONS,
  LEDGER_CHART,
  LEDGER_HOLE,
  LEDGER_HOLES,
  LEDGER_SEASON,
  LEDGER_SHOW_ROW,
  LEDGER_SHOW_TEXT,
} from './season-ledger/ledgerLayout';
import { LEDGER_ROWS } from './season-ledger/ledgerLines';
import { loadLedger } from './season-ledger/loadLedger';

/**
 * Season ledger: is my record of this show complete? One show at a
 * time, most holes first; Watched and Skipped close a hole. Owner only.
 */
export default async function SeasonLedger({
  profile,
}: Readonly<{ profile: Profile }>) {
  const [shows, overview] = await Promise.all([
    loadLedger(profile),
    loadOverview(profile),
  ]);
  if (shows.length > 0) {
    return <LedgerLane shows={shows} />;
  }
  const sub = isDayZero(overview)
    ? 'Nothing logged yet, so nothing missing.'
    : 'Every episode of what you follow is logged.';
  return (
    <Lane dot="white" hollow id="season-ledger" title="Season ledger">
      <EmptyState glyph={seasonGlyph} sub={sub} title="No gaps" />
    </Lane>
  );
}

/** A typical ledger show's seasons (the stub's long-runner: 26, two columns) */
const COLUMNS = [0, 1];
const SEASONS = Array.from({ length: 13 }, (_, n) => n);
const HOLES = Array.from({ length: LEDGER_ROWS }, (_, n) => n);

const CHART = cn(LEDGER_CHART, 'grid-cols-2');

const HOLE_GHOST = cn(LEDGER_HOLE, GHOST_FILL);

function HoleGhost() {
  return (
    <div className={HOLE_GHOST}>
      <MetaRow className="flex-1 gap-2.5" fit="drop">
        <CodeBadge className={FLAT} size="lane" />
        <TextLine className="text-meta" width="w-24" />
      </MetaRow>
      <span className={LEDGER_BUTTONS}>
        <ButtonFace className={LEDGER_BUTTON} variant="outline">
          Watched
        </ButtonFace>
        <ButtonFace className={LEDGER_BUTTON} variant="outline">
          Skipped
        </ButtonFace>
      </span>
    </div>
  );
}

/** The ledger's placeholder: the show, a two-column chart and three holes */
export function SeasonLedgerSkeleton() {
  const link = <LinkGhost width="w-36" />;
  return (
    <LaneGhost link={link} title="Season ledger">
      <div className={LEDGER_SHOW_ROW}>
        <Ghost className="aspect-2/3 w-10 shrink-0 rounded-6" />
        <span className={LEDGER_SHOW_TEXT}>
          <TextLine className="text-body-sm" width="w-36" />
          <MetaRow fit="drop">
            <TextLine className="text-meta" width="w-48" />
          </MetaRow>
        </span>
      </div>
      <div className={CHART}>
        {COLUMNS.map((column) => (
          <span className="flex flex-col" key={column}>
            {SEASONS.map((season) => (
              <span className={LEDGER_SEASON} key={season}>
                <span className="w-4 shrink-0" />
                <Ghost className="h-1 flex-1 rounded-2" />
              </span>
            ))}
          </span>
        ))}
      </div>
      <div className={LEDGER_HOLES}>
        {HOLES.map((hole) => (
          <HoleGhost key={hole} />
        ))}
      </div>
    </LaneGhost>
  );
}
