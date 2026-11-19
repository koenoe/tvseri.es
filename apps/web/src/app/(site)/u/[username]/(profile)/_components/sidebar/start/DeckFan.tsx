'use client';

import * as m from 'motion/react-m';
import Image from 'next/image';
import type { ReactNode } from 'react';

import { DECK_CARD, DECK_FAN } from './deckLayout';
import { type StartCard, slotAt } from './startCards';

const CARD = `${DECK_CARD} bg-ground shadow-[0_24px_40px_-14px_rgb(0_0_0/0.85),inset_0_0_0_1px_rgb(221_238_255/0.08)]`;

/** The five fanned slots plus one waiting behind: the rest aren't rendered, so their posters don't load */
const VISIBLE = 6;

const SPRING = { damping: 28, stiffness: 240, type: 'spring' } as const;

/**
 * The fanned deck: the top card straight, four behind it
 * tilted and darker. Cards keep their identity, so a deal is the cards
 * sliding to their new slots (transform and opacity only). The cards are
 * pictures only; `children` (the top card's link) sits over the top slot.
 * Place it inside a `LazyMotion`.
 */
export default function DeckFan({
  cards,
  children,
  dealt,
  order,
}: Readonly<{
  cards: ReadonlyArray<StartCard>;
  /** Over the top slot, above every card: the current pick's link */
  children?: ReactNode;
  /** False until the first deal: the server-rendered fan must not animate in */
  dealt: boolean;
  order: ReadonlyArray<number>;
}>) {
  const visible = order
    .slice(0, VISIBLE)
    .flatMap((id) => cards.filter((card) => card.id === id));
  const transition = dealt ? SPRING : { duration: 0 };
  return (
    <div className={DECK_FAN}>
      {visible.map((card) => {
        const slot = slotAt(order.indexOf(card.id));
        const animate = {
          opacity: slot.opacity,
          rotate: slot.rotate,
          x: slot.x,
          y: slot.y,
        };
        const style = { zIndex: slot.z };
        const dim = { opacity: slot.dim };
        return (
          <m.div
            animate={animate}
            aria-hidden="true"
            className={CARD}
            initial={false}
            key={card.id}
            style={style}
            transition={transition}
          >
            <Image
              alt=""
              className="size-full object-cover"
              height={198}
              src={card.poster}
              width={132}
            />
            <m.span
              animate={dim}
              className="absolute inset-0 bg-black"
              initial={false}
              transition={transition}
            />
          </m.div>
        );
      })}
      {children}
    </div>
  );
}
