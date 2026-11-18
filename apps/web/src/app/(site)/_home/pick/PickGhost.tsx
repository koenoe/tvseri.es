import type { CSSProperties } from 'react';
import WatchlistToggleGhost from '@/components/marking/WatchlistToggleGhost';
import {
  ButtonFace,
  FLAT,
  PULSE,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import { variantDiceGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import { PAGE_COLUMN } from '../frame';
import { restPose } from './deck';
import {
  DECK_BOX,
  DECK_CARD,
  DECK_FRAME,
  PICK_BODY,
  PICK_PANEL,
  RESULT,
  RESULT_ACTIONS,
  RESULT_TITLE,
  RESULT_WHY,
  ROLL_LABEL,
} from './layout';
import styles from './pick.module.css';

/** The day's seven */
const DECK_SIZE = 7;

/** The fan at rest on the first pick, as the deck draws it (`restPose`) */
const FAN = Array.from({ length: DECK_SIZE }, (_, k) => {
  const pose = restPose(0, k, DECK_SIZE);
  const style: CSSProperties = {
    transform: pose.transform,
    zIndex: pose.zIndex,
  };
  // flat ghosts in the cards' places: no card face, ring or shadow
  const className = cn(DECK_CARD, FLAT);
  return { className, k, style };
});

const DECK = cn(DECK_BOX, styles.fan, PULSE);
const LINES = cn('flex flex-col gap-2', PULSE);
const WHY = cn('text-meta', RESULT_WHY);
const ACTIONS = cn(RESULT_ACTIONS, PULSE);

/**
 * Can't decide? Let us pick's placeholder: the card, flat ghosts in the
 * seven posters' places fanned as the deck rests, the pick's title, facts
 * and why lines, and Watchlist and Roll again as flat pills in their
 * buttons' boxes (no real controls or finished surfaces in a skeleton).
 */
export default function PickGhost() {
  return (
    <section aria-hidden className={PAGE_COLUMN} data-placeholder="pick-one">
      <div className={PICK_PANEL}>
        <div className={PICK_BODY}>
          <div className={DECK_FRAME}>
            <div className={DECK}>
              {FAN.map(({ className, k, style }) => (
                <span className={className} key={k} style={style} />
              ))}
            </div>
          </div>
          <div className={RESULT}>
            <span className={LINES}>
              <TextLine bar="h-5" className={RESULT_TITLE} width="w-48" />
              <TextLine className="text-meta" width="w-44" />
              <TextLine className={WHY} width="w-64" />
            </span>
            <div className={ACTIONS}>
              <WatchlistToggleGhost />
              <ButtonFace icon={variantDiceGlyph} variant="outline">
                {ROLL_LABEL}
              </ButtonFace>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
