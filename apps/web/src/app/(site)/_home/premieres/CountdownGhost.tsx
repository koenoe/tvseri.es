import { PillSwitchGhost } from '@/components/ui/button/PillSwitch';
import { ButtonGhost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import { arrowRightGlyph, calendarGlyph } from '@/components/ui/icon/glyphs';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { MomentFrame } from '../feature/Moment';
import { PAGE_COLUMN } from '../frame';
import MomentLabel from '../MomentLabel';
import { COUNTDOWN_TITLE } from './Countdown';
import {
  COUNTDOWN_BODY,
  COUNTDOWN_CARD,
  COUNTDOWN_COUNT,
  COUNTDOWN_FACTS,
  COUNTDOWN_FOOT,
  COUNTDOWN_LABEL,
  COUNTDOWN_LOGO,
  COUNTDOWN_NUMBER,
  COUNTDOWN_SWITCH,
  COUNTDOWN_TRACK,
  COUNTDOWN_UNIT,
} from './countdownLayout';

const CARD = cn(COUNTDOWN_CARD, PULSE);

const LOGO = cn(COUNTDOWN_LOGO, 'rounded-8', GHOST_FILL);
const FACTS = cn('text-meta', COUNTDOWN_FACTS);

/** Up to three premieres: the pills' usual count when the day's isn't known */
const TYPICAL = 3;

/**
 * The Countdown's placeholder (on its days it takes the feature's slot): the
 * card with its label (real text), the count and its unit,
 * the empty 30-day line, the logo's box, the facts line, and in the foot
 * the pills, or "Open" with one premiere.
 */
export default function CountdownGhost({
  count,
}: Readonly<{ count?: number | null }>) {
  const premieres = count ?? TYPICAL;
  return (
    <MomentFrame name="feature" placeholder>
      <div className={PAGE_COLUMN}>
        <div className={CARD}>
          <div className={COUNTDOWN_LABEL}>
            <MomentLabel glyph={calendarGlyph} title={COUNTDOWN_TITLE} />
          </div>
          <div className={COUNTDOWN_BODY}>
            <span className={COUNTDOWN_COUNT}>
              <TextLine
                bar="h-16 md:h-24"
                className={COUNTDOWN_NUMBER}
                width="w-14 md:w-20"
              />
              <TextLine className={COUNTDOWN_UNIT} width="w-28" />
            </span>
            <span className={COUNTDOWN_TRACK} />
            <span className={LOGO} />
            <TextLine className={FACTS} width="w-40" />
          </div>
          <div className={COUNTDOWN_FOOT}>
            {premieres === 1 ? (
              <ButtonGhost icon={arrowRightGlyph} width="w-28" />
            ) : (
              <PillSwitchGhost className={COUNTDOWN_SWITCH} count={premieres} />
            )}
          </div>
        </div>
      </div>
    </MomentFrame>
  );
}
