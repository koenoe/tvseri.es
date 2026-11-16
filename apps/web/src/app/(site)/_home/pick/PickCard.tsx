'use client';

import type { ControlStatesRead } from '@/lib/marking/controlState';

import { PAGE_COLUMN } from '../frame';
import { PICK_TITLE } from '../moments';
import { DECK_FRAME, PICK_BODY, PICK_PANEL } from './layout';
import PickDeck, { type PickCardItem } from './PickDeck';
import PickResult from './PickResult';
import { usePickRoll } from './usePickRoll';

/**
 * The Pick one moment, with no title or label. Desktop (HMFinal): a 400px
 * dark card, the fanned deck left and the result right. Below 1280: one
 * dark card holding the fan, scaled down (`DECK_BOX`) and clipped by the
 * card, and the result centred under it. The fan is about 730px wide and
 * needs the 688px column the page has from 1280 (it may reach into the
 * 48px gap); below 1280 it ran over the result's title and Watchlist (at
 * 1100), so the stacked layout holds until then.
 */
export default function PickCard({
  cards,
  states,
}: Readonly<{
  cards: ReadonlyArray<PickCardItem>;
  states?: ControlStatesRead;
}>) {
  const { phase, pick, roll, seed } = usePickRoll(cards.length);
  const card = cards[pick];
  if (!card) {
    return null;
  }
  return (
    <section
      aria-label={PICK_TITLE}
      className={PAGE_COLUMN}
      data-slot="pick-one"
    >
      <div className={PICK_PANEL}>
        <div className={PICK_BODY}>
          <div className={DECK_FRAME}>
            <PickDeck cards={cards} phase={phase} pick={pick} seed={seed} />
          </div>
          <PickResult card={card} onRoll={roll} states={states} />
        </div>
      </div>
    </section>
  );
}
