'use client';

import { SIGNED_IN_ONLY, SIGNED_OUT_ONLY } from '@/components/ui/viewer/reveal';
import type { ControlStatesRead } from '@/lib/marking/controlState';

import { PAGE_COLUMN } from '../frame';
import { PICK_TITLE } from '../moments';
import { DECK_FRAME, PICK_BODY, PICK_PANEL } from './layout';
import PickDeck, { type PickCardItem } from './PickDeck';
import PickGhost from './PickGhost';
import PickResult from './PickResult';
import usePickDeal from './usePickDeal';
import { usePickRoll } from './usePickRoll';

/**
 * While a signed-in viewer's library is on its way the card stays out of
 * sight and its placeholder holds its box (the pre-paint hint picks which)
 */
const UNTIL_KNOWN = { [SIGNED_OUT_ONLY]: '' };
const GHOST_UNTIL_KNOWN = { [SIGNED_IN_ONLY]: '' };

/**
 * The Pick one moment, with no visible title or label (`PICK_TITLE` is its
 * accessible name). Desktop: a 400px
 * dark card, the fanned deck left and the result right. Below 1280: one
 * dark card holding the fan, scaled down (`DECK_BOX`) and clipped by the
 * card, and the result centred under it. The fan is about 730px wide and
 * needs the 688px column the page has from 1280 (it may reach into the
 * 48px gap); below 1280 it would run over the result's title and Watchlist
 * (at 1100), so the stacked layout holds until then.
 *
 * A signed-in viewer is dealt only shows new to them (`usePickDeal`). One
 * new show left: no Roll again; none: the block is not drawn.
 */
export default function PickCard({
  pool,
  states,
}: Readonly<{
  pool: ReadonlyArray<PickCardItem>;
  states?: ControlStatesRead;
}>) {
  const { cards, known } = usePickDeal(pool);
  const { phase, pick, roll, seed } = usePickRoll(cards.length);
  // a roll that began before the deal landed may point past the dealt cards
  const shown = cards.length > 0 ? pick % cards.length : 0;
  const card = cards[shown];
  if (!card) {
    return null;
  }
  const hide = known ? undefined : UNTIL_KNOWN;
  const onRoll = cards.length > 1 ? roll : undefined;
  // the placeholder is the card's sibling, so the card is never remounted
  return (
    <>
      <section
        aria-label={PICK_TITLE}
        className={PAGE_COLUMN}
        data-slot="pick-one"
        {...hide}
      >
        <div className={PICK_PANEL}>
          <div className={PICK_BODY}>
            <div className={DECK_FRAME}>
              <PickDeck cards={cards} phase={phase} pick={shown} seed={seed} />
            </div>
            <PickResult card={card} onRoll={onRoll} states={states} />
          </div>
        </div>
      </section>
      {known ? null : (
        <div {...GHOST_UNTIL_KNOWN} className="hidden">
          <PickGhost />
        </div>
      )}
    </>
  );
}
