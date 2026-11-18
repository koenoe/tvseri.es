import LaneRowGhost from '@/components/lane-row/LaneRowGhost';
import Badge from '@/components/ui/button/Badge';
import {
  ButtonFace,
  FLAT,
  ghostCircle,
  Line,
  PULSE,
} from '@/components/ui/ghost/ghosts';
import { userGlyph } from '@/components/ui/icon/glyphs';
import Dot from '@/components/ui/lane/Dot';
import { LaneGhost as BaseLaneGhost } from '@/components/ui/lane/Lane';
import { HOME_LANE } from '@/components/ui/lane/laneLooks';
import UpNextCardGhost from '@/components/up-next/UpNextCardGhost';
import cn from '@/lib/cn';

import {
  CONTINUE_HEAD,
  CONTINUE_SECTION,
  CONTINUE_TITLE,
  CONTINUE_WATCHING_TITLE,
  continueGrid,
  IN_PROGRESS_ROW,
  IN_PROGRESS_ROW_GHOST,
  LANE_POSTER_EMPTY,
  LANE_REMOTE,
  LANE_ROW_PHONE_HIDDEN,
  LANE_ROWS,
  LANE_TITLE_TEXT,
  PROFILE_BUTTON_HEAD,
  PROFILE_BUTTON_PHONE,
  PROFILE_LABEL,
} from './continueLayout';

/**
 * Continue watching's placeholder, built from the section's own layout
 * (`continueLayout.ts`): the real title, then the Up next card's ghost (the
 * shared card's, with its ⋯) and the In progress lane in the real grid: the lane's rows with their
 * poster, lines, empty segments and pill; "Your profile" as a flat pill. The
 * grid pulses as one layer, so the ghosts inside carry the fill only. The
 * lane is drawn: most viewers have more than one show in progress (one show
 * has no lane).
 */

const LANE_GHOST_ROWS = Array.from({ length: LANE_ROWS }, (_, n) => n);

const DOT = <Dot colour={FLAT} tone="cyan" />;
const COUNT = <Badge className={FLAT} variant="count" />;

/** The card's ⋯ */
const CARD_ACTION_CIRCLE = ghostCircle();
const CARD_ACTION = <span className={CARD_ACTION_CIRCLE} />;

/** A lane row's ghosts: the empty poster, the title and count, the time, the ⋯ */
const ROW_POSTER = <span className={LANE_POSTER_EMPTY} />;
const ROW_TITLE = (
  <>
    <Line className="h-6" width="w-28" />
    <Line className="h-5" width="w-10" />
  </>
);
const ROW_FACTS = <Line className="h-5" width="w-24" />;
const ROW_REMOTE_CIRCLE = ghostCircle(LANE_REMOTE);
const ROW_REMOTE = <span className={ROW_REMOTE_CIRCLE} />;

function LaneGhost() {
  return (
    <BaseLaneGhost
      count={COUNT}
      dot={DOT}
      look={HOME_LANE}
      placeholder="continue-lane"
      title={LANE_TITLE_TEXT}
    >
      {LANE_GHOST_ROWS.map((n) => {
        const phoneHidden = n > 0 ? LANE_ROW_PHONE_HIDDEN : undefined;
        return (
          <LaneRowGhost
            className={phoneHidden}
            end={ROW_REMOTE}
            facts={ROW_FACTS}
            ghost={IN_PROGRESS_ROW_GHOST}
            key={n}
            layout={IN_PROGRESS_ROW}
            poster={ROW_POSTER}
            title={ROW_TITLE}
          />
        );
      })}
      <ButtonFace className={PROFILE_BUTTON_PHONE} icon={userGlyph}>
        {PROFILE_LABEL}
        <Line className="h-5" width="w-24" />
      </ButtonFace>
    </BaseLaneGhost>
  );
}

const GRID = cn(continueGrid(true), PULSE);

export default function ContinueGhost() {
  return (
    <section
      aria-hidden
      className={CONTINUE_SECTION}
      data-placeholder="continue"
    >
      <div className={CONTINUE_HEAD}>
        <h2 className={CONTINUE_TITLE}>{CONTINUE_WATCHING_TITLE}</h2>
        <ButtonFace className={PROFILE_BUTTON_HEAD} icon={userGlyph}>
          {PROFILE_LABEL}
        </ButtonFace>
      </div>
      <div className={GRID}>
        <UpNextCardGhost actions={CARD_ACTION} />
        <LaneGhost />
      </div>
    </section>
  );
}
