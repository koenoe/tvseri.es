'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import cn from '@/lib/cn';
import showPath from '@/lib/routing/showPath';
import { type CardPose, restPose, shufflePose } from './deck';
import { DECK_BOX, DECK_CARD, DECK_CARD_BACK, DECK_CARD_FRONT } from './layout';
import styles from './pick.module.css';
import type { RollPhase } from './usePickRoll';

/** What the island needs of each show (the server writes the lines) */
export type PickCardItem = Readonly<{
  genre: string;
  id: number;
  poster: string;
  seasons: string;
  slug: string;
  title: string;
  why: string;
  year: string;
}>;

type Props = Readonly<{
  cards: ReadonlyArray<PickCardItem>;
  phase: RollPhase;
  pick: number;
  seed: number;
}>;

/**
 * HMFinal's per-card `filter: brightness()` transitions, as a black shade
 * over each poster whose opacity is `1 - brightness` (the same pixels for
 * brightness up to 1): opacity runs on the compositor in every engine, where
 * a filter transition repaints the poster each frame in WebKit.
 */
const TRANSITION: Readonly<
  Record<Exclude<RollPhase, 'rest'>, Readonly<{ card: string; shade: string }>>
> = {
  settle: {
    card: 'transform .72s cubic-bezier(.34,1.36,.64,1)',
    shade: 'opacity .4s',
  },
  shuffle: {
    card: 'transform .34s cubic-bezier(.4,0,.2,1)',
    shade: 'opacity .34s',
  },
};

// at rest nothing moves, so the server's 'none' always matches the first paint
const transitionFor = (phase: RollPhase) =>
  phase === 'rest' ? { card: 'none', shade: 'none' } : TRANSITION[phase];

const cardStyle = (pose: CardPose, transition: string): CSSProperties => ({
  transform: pose.transform,
  transition,
  zIndex: pose.zIndex,
});

const shadeStyle = (pose: CardPose, transition: string): CSSProperties => ({
  opacity: Math.round((1 - pose.brightness) * 1000) / 1000,
  transition,
});

/**
 * HMFinal `e3-deck`: seven posters fanned around the pick (`deck.ts`). The
 * pick's poster opens its show for a pointer; the deck is hidden from assistive
 * tech and out of the tab order (the result names the pick and its title
 * opens the show).
 */
export default function PickDeck({ cards, phase, pick, seed }: Props) {
  const shuffling = phase === 'shuffle';
  // the motion blur follows the posters' speed (pick.module.css)
  const deckClass = cn(DECK_BOX, phase !== 'rest' && styles.rolling);
  return (
    <div aria-hidden="true" className={deckClass}>
      {cards.map((card, k) => {
        const front = !shuffling && k === pick;
        const pose = shuffling
          ? shufflePose(k, seed)
          : restPose(pick, k, cards.length);
        const transition = transitionFor(phase);
        const style = cardStyle(pose, transition.card);
        const shade = shadeStyle(pose, transition.shade);
        const className = cn(
          DECK_CARD,
          phase !== 'rest' && 'will-change-transform',
          // only the pick opens its show, and never mid-roll
          !(front && phase === 'rest') && 'pointer-events-none',
          front ? DECK_CARD_FRONT : DECK_CARD_BACK,
        );
        return (
          <Link
            className={className}
            data-hairline
            href={showPath(card.id, card.slug)}
            key={card.id}
            prefetch={false}
            style={style}
            tabIndex={-1}
          >
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="180px"
              src={card.poster}
            />
            <span className="absolute inset-0 bg-black" style={shade} />
          </Link>
        );
      })}
    </div>
  );
}
