'use client';

import { useEffect, useRef, useState } from 'react';

import { nextPick } from './deck';

export type RollPhase = 'rest' | 'settle' | 'shuffle';

/** Each phase ends a little after its transition (.34s, .72s in `PickDeck`) */
const SHUFFLE_MS = 360;
const SETTLE_MS = 760;

export type PickRoll = Readonly<{
  phase: RollPhase;
  pick: number;
  roll: () => void;
  seed: number;
}>;

/**
 * The deck's state: the first card is the first pick (server and client
 * agree), Roll again shuffles, then settles on any other card. A roll in
 * progress ignores further clicks: a second roll would restart the shuffle
 * mid-flight and the cards would jump. Roll again shows it (`aria-disabled`
 * while `phase` isn't rest), so no press is lost without a cue.
 */
export function usePickRoll(size: number): PickRoll {
  const [pick, setPick] = useState(0);
  const [phase, setPhase] = useState<RollPhase>('rest');
  const [seed, setSeed] = useState(1);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);

  // A roll in flight stops with the deck (navigating away mid-roll)
  useEffect(
    () => () => {
      for (const timer of timers.current) {
        window.clearTimeout(timer);
      }
    },
    [],
  );

  const roll = () => {
    if (busy.current || size < 2) {
      return;
    }
    busy.current = true;
    const next = nextPick(pick, size, Math.random());
    setSeed((value) => value + 1);
    setPhase('shuffle');
    const settle = () => {
      setPhase('rest');
      busy.current = false;
    };
    const land = () => {
      setPick(next);
      setPhase('settle');
      timers.current = [window.setTimeout(settle, SETTLE_MS)];
    };
    timers.current = [window.setTimeout(land, SHUFFLE_MS)];
  };

  return { phase, pick, roll, seed };
}
