'use client';

import { useIsPresent, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import {
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import cn from '@/lib/cn';

import { leaveFold } from './fold';

/** A Skip all's items leave 30ms apart, the ninth on with the eighth */
const SWEEP_STEP = 0.03;
const SWEEP_CAP = 8;

const HERE = { height: 'auto', opacity: 1, y: 0 } as const;
const AWAY = { height: 0, opacity: 0 } as const;

/** Marks each item, so a list can find the ones still here */
export const LEAVING_ITEM = 'data-leaving-item';

/**
 * An item that takes a leaving one's place (`arrive`) opens on the leave's
 * own height timing, so the list keeps its height as one shuts and the
 * other opens
 */
const arriving = (reduced: boolean) => {
  const { height } = leaveFold(0, reduced).transition;
  return { ...HERE, transition: { height, opacity: height } };
};

/**
 * An item inside its list's `AnimatePresence` (a review entry, a lane's
 * row): one that leaves fades and lifts, then its gap shuts (`leaveFold`).
 * The presence's `custom` says whether a sweep (Skip all, Hide all) took
 * the whole list, so its items leave one after another. While it leaves it
 * takes no press; `onLeave` gets it as it starts, before paint, to move
 * focus held in it. It clips only while it moves. Nothing moves on the
 * first render, or for an item a page adds unless it `arrive`s.
 */
export default function LeavingItem({
  arrive = false,
  as = 'div',
  children,
  className,
  index,
  onLeave,
}: Readonly<{
  /** It opens into the list when it's added after the first render */
  arrive?: boolean;
  /** `li` in a list (the item is the list's own row) */
  as?: 'div' | 'li';
  children: ReactNode;
  /** The item's place in its list (a gapped list's margin) */
  className?: string;
  index: number;
  onLeave?: (item: HTMLElement) => void;
}>) {
  const present = useIsPresent();
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement & HTMLLIElement>(null);
  const [moving, setMoving] = useState(false);
  const start = () => setMoving(true);
  const settle = () => setMoving(false);
  const variants = useMemo(
    () => ({
      away: AWAY,
      gone: (swept: boolean) =>
        leaveFold(swept ? Math.min(index, SWEEP_CAP) * SWEEP_STEP : 0, reduced),
      here: arrive ? arriving(reduced) : HERE,
    }),
    [arrive, index, reduced],
  );
  // in the commit that makes it inert, before focus falls to the page
  useLayoutEffect(() => {
    if (!present && ref.current) {
      onLeave?.(ref.current);
    }
  }, [onLeave, present]);
  const classes = cn((moving || !present) && 'overflow-hidden', className);
  const marker = { [LEAVING_ITEM]: '' };
  const Item = as === 'li' ? m.li : m.div;
  return (
    <Item
      {...marker}
      animate="here"
      className={classes}
      custom={false}
      exit="gone"
      inert={!present}
      initial={arrive ? 'away' : undefined}
      onAnimationComplete={settle}
      onAnimationStart={start}
      ref={ref}
      variants={variants}
    >
      {children}
    </Item>
  );
}
