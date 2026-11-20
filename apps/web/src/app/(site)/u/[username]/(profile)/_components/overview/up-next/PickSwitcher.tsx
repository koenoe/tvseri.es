'use client';

import { type ReactNode, useState } from 'react';

import CrossFade from '@/components/motion/CrossFade';
import CircleButton from '@/components/ui/button/CircleButton';
import { closeGlyph } from '@/components/ui/icon/glyphs';
import { UP_NEXT_ACTIONS_OVER } from '@/components/up-next/upNextLayout';
import cn from '@/lib/cn';

/** Over the card, where its controls sit */
const NOT_NOW = cn(UP_NEXT_ACTIONS_OVER, 'z-30');

/**
 * The last Not now took the × (and its focus) away: the empty line takes
 * focus in its place. Focus held anywhere else stays put.
 */
const takeDroppedFocus = (node: HTMLElement | null) => {
  if (node && document.activeElement === document.body) {
    node.focus({ preventScroll: true });
  }
};

/**
 * The empty block's borrowed pick: the × "Not now" at the card's top right
 * swaps it for the next one, the cards cross-fading as Home's pick does
 * (`CrossFade`: they share one size) while the × stays put and keeps focus.
 * Each card arrives rendered; this only chooses. Out of picks, the ×
 * goes with the last card, so focus moves to what replaces it rather than
 * falling to the page.
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
    return (
      <div className="outline-none" ref={takeDroppedFocus} tabIndex={-1}>
        {fallback}
      </div>
    );
  }
  const next = () => setIndex((current) => current + 1);
  return (
    <div className="relative">
      <CrossFade swapKey={index}>{card}</CrossFade>
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
