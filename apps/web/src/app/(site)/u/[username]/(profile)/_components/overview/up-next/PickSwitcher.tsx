'use client';

import { type ReactNode, useState } from 'react';

import CircleButton from '@/components/ui/button/CircleButton';
import { closeGlyph } from '@/components/ui/icon/glyphs';
import { UP_NEXT_ACTIONS_OVER } from '@/components/up-next/upNextLayout';
import cn from '@/lib/cn';

/** Over the card, where its controls sit */
const NOT_NOW = cn(UP_NEXT_ACTIONS_OVER, 'z-30');

/**
 * The empty block's borrowed pick: the × "Not now" at the
 * card's top right swaps it for the next one. Each card arrives rendered;
 * this only chooses.
 */
export default function PickSwitcher({
  cards,
  fallback,
}: Readonly<{
  cards: ReadonlyArray<ReactNode>;
  /** Out of picks: the calm empty line */
  fallback: ReactNode;
}>) {
  const [index, setIndex] = useState(0);
  const card = cards[index];
  if (!card) {
    return fallback;
  }
  const next = () => setIndex((current) => current + 1);
  return (
    <div className="relative">
      {card}
      <span className={NOT_NOW}>
        <CircleButton
          icon={closeGlyph}
          label="Not now, show another pick"
          onClick={next}
        />
      </span>
    </div>
  );
}
