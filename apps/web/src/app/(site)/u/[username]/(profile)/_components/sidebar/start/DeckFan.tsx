'use client';

import * as m from 'motion/react-m';
import Image from 'next/image';

import { DECK_CARD, DECK_FAN } from './deckLayout';
import { type StartCard, slotAt } from './startCards';

const CARD = `${DECK_CARD} bg-[#1c2223] shadow-[0_24px_40px_-14px_rgb(0_0_0/0.85),inset_0_0_0_1px_rgb(221_238_255/0.08)]`;

/** The five fanned slots plus one waiting behind: the rest aren't rendered, so their posters don't load */
const VISIBLE = 6;

const SPRING = { damping: 28, stiffness: 240, type: 'spring' } as const;

/**
 * The fanned deck: the top card straight, four behind it
 * tilted and darker. Cards keep their identity, so a deal is the cards
 * sliding to their new slots (transform and opacity only). Place it inside
 * a `LazyMotion`.
 */
export default function DeckFan({
  cards,
  dealt,
  order,
}: Readonly<{
  cards: ReadonlyArray<StartCard>;
  /** False until the first deal: the server-rendered fan must not animate in */
  dealt: boolean;
  order: ReadonlyArray<number>;
}>) {
  const visible = order
    .slice(0, VISIBLE)
    .flatMap((id) => cards.filter((card) => card.id === id));
  return (
    <div aria-hidden="true" className={DECK_FAN}>
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
            className={CARD}
            initial={false}
            key={card.id}
            style={style}
            transition={dealt ? SPRING : { duration: 0 }}
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
              transition={dealt ? SPRING : { duration: 0 }}
            />
          </m.div>
        );
      })}
    </div>
  );
}
