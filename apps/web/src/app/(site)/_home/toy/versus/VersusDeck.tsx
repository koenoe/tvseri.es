'use client';

import type { VersusPair } from '@tvseri.es/schemas';
import { useId, useState } from 'react';

import CrossFade from '@/components/motion/CrossFade';
import { TEXT_ARRIVAL_VARIANTS } from '@/components/motion/textArrival';
import Button from '@/components/ui/button/Button';
import { shuffleGlyph } from '@/components/ui/icon/glyphs';
import { SIGNED_IN_ONLY, SIGNED_OUT_ONLY } from '@/components/ui/viewer/reveal';
import { PAGE_COLUMN } from '../../frame';
import { TOY_TITLE } from '../../moments';
import useWarmSet from '../useWarmSet';
import { ANOTHER_PAIR_LABEL, versusAnnouncement } from './copy';
import { nextChoice } from './deck';
import {
  VERSUS_CARD,
  VERSUS_MIDDLE,
  VERSUS_MORE,
  VERSUS_ROWS_PLACE,
  VERSUS_SIDE,
} from './layout';
import type { Side } from './rows';
import useVersusDeck from './useVersusDeck';
import VersusGhost from './VersusGhost';
import VersusHeading from './VersusHeading';
import VersusPoster, { type PosterState } from './VersusPoster';
import VersusResult from './VersusResult';
import VersusRows from './VersusRows';

/**
 * While a signed-in viewer's library is on its way the card stays out of
 * sight and its placeholder holds its box (the pre-paint hint picks which)
 */
const UNTIL_KNOWN = { [SIGNED_OUT_ONLY]: '' };
const GHOST_UNTIL_KNOWN = { [SIGNED_IN_ONLY]: '' };

const stateOf = (side: Side, chosen: Side | null): PosterState =>
  chosen === null ? 'idle' : chosen === side ? 'chosen' : 'out';

/**
 * Versus: two similar series face to face. Tapping a
 * poster chooses it (the other side dims and the actions replace the hint);
 * tapping the other switches, tapping it again clears. "Another pair" steps
 * through the day's deck: the posters cross-fade, then the names and the
 * rows arrive just behind them (`textArrival`).
 *
 * A signed-in viewer gets only the pairs with neither series in their lists
 * (`useVersusDeck`); with no pair left the block is not drawn.
 */
export default function VersusDeck({
  pairs: deck,
}: Readonly<{ pairs: ReadonlyArray<VersusPair> }>) {
  const headingId = useId();
  const { known, pairs } = useVersusDeck(deck);
  const [shown, setShown] = useState(0);
  const [chosen, setChosen] = useState<Side | null>(null);
  const [warm, addWarm] = useWarmSet([0]);
  const index = pairs.length > 0 ? shown % pairs.length : 0;
  const pair = pairs[index];
  if (!pair) {
    return null;
  }

  const lefts = pairs.map((each) => each.left);
  const rights = pairs.map((each) => each.right);
  const following = (index + 1) % pairs.length;
  const warmNext = () => addWarm(following);
  const another = () => {
    addWarm(following);
    setShown(following);
    setChosen(null);
  };
  const tapLeft = () => setChosen((current) => nextChoice(current, 'left'));
  const tapRight = () => setChosen((current) => nextChoice(current, 'right'));
  const titles = { left: pair.left.title, right: pair.right.title };
  const announcement = versusAnnouncement(titles, chosen);
  const chosenSeries = chosen ? pair[chosen] : null;
  const hide = known ? undefined : UNTIL_KNOWN;
  const pairKey = `${pair.left.id}-${pair.right.id}`;
  const leftState = stateOf('left', chosen);
  const rightState = stateOf('right', chosen);

  // the placeholder is the card's sibling, so the card is never remounted
  return (
    <>
      <div data-slot="toy" {...hide}>
        <div className={PAGE_COLUMN}>
          <section
            aria-describedby={headingId}
            aria-label={TOY_TITLE.versus}
            className={VERSUS_CARD}
          >
            <div className={VERSUS_SIDE.left}>
              <VersusPoster
                current={index}
                onTap={tapLeft}
                sides={lefts}
                state={leftState}
                warm={warm}
              />
            </div>
            <div className={VERSUS_MIDDLE}>
              <VersusHeading id={headingId} />
              <CrossFade
                frame={VERSUS_ROWS_PLACE}
                swapKey={pairKey}
                variants={TEXT_ARRIVAL_VARIANTS}
              >
                <VersusRows pair={pair} />
              </CrossFade>
              <VersusResult chosen={chosenSeries} />
              {pairs.length > 1 ? (
                <div className={VERSUS_MORE}>
                  <Button
                    icon={shuffleGlyph}
                    onClick={another}
                    onFocus={warmNext}
                    onPointerEnter={warmNext}
                    size="sm"
                  >
                    {ANOTHER_PAIR_LABEL}
                  </Button>
                </div>
              ) : null}
            </div>
            <div className={VERSUS_SIDE.right}>
              <VersusPoster
                current={index}
                onTap={tapRight}
                sides={rights}
                state={rightState}
                warm={warm}
              />
            </div>
            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>
          </section>
        </div>
      </div>
      {known ? null : (
        <div {...GHOST_UNTIL_KNOWN} className="hidden">
          <VersusGhost />
        </div>
      )}
    </>
  );
}
