'use client';

import { useEffect, useState } from 'react';

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
  const [next, setNext] = useState(0);
  const [phase, setPhase] = useState<RollPhase>('rest');
  const [seed, setSeed] = useState(1);

  // Each step is scheduled by the phase it ends, not by the press: Next
  // keeps a left page mounted but hidden, which clears the timer and keeps
  // the phase, so showing the page again runs that step again and finishes
  useEffect(() => {
    if (phase === 'rest') {
      return;
    }
    const timer = window.setTimeout(
      () => {
        if (phase === 'shuffle') {
          setPick(next);
          setPhase('settle');
        } else {
          setPhase('rest');
        }
      },
      phase === 'shuffle' ? SHUFFLE_MS : SETTLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [next, phase]);

  const roll = () => {
    if (phase !== 'rest' || size < 2) {
      return;
    }
    setNext(nextPick(pick, size, Math.random()));
    setSeed((value) => value + 1);
    setPhase('shuffle');
  };

  return { phase, pick, roll, seed };
}
