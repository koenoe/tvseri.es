'use client';

import { AnimatePresence, useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import {
  type Key,
  type ReactNode,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { FOCUSABLE } from '@/lib/a11y/focusable';

import { GRID_ENTER, GRID_EXIT, GRID_TRANSITION } from './gridExit';
import MaxMotion from './MaxMotion';

/** Anything else takes it out at once (a filter, Show fewer): never typing */
const AT_ONCE = { opacity: 0, transition: { duration: 0 } } as const;
const VARIANTS = {
  gone: (asked: boolean) => (asked ? GRID_EXIT : AT_ONCE),
  here: { ...GRID_ENTER.animate, scale: 1 },
  /** Folded away, held where the rise starts: see `useRiseIntoView` */
  waiting: { ...GRID_ENTER.initial, transition: { duration: 0 } },
} as const;
/** The tile stretches to its cell, as it did as the grid's own item */
const CELL = 'grid min-w-0';

/** The cells still here after the leaving one, then before it, nearest first */
function neighboursOf(cell: Element): ReadonlyArray<Element> {
  const here = (each: Element | null): each is Element =>
    each !== null && !each.hasAttribute('inert');
  const after: Element[] = [];
  for (
    let next = cell.nextElementSibling;
    next;
    next = next.nextElementSibling
  ) {
    after.push(next);
  }
  const before: Element[] = [];
  for (
    let previous = cell.previousElementSibling;
    previous;
    previous = previous.previousElementSibling
  ) {
    before.push(previous);
  }
  return [...after, ...before].filter(here);
}

/**
 * Focus held in a leaving cell goes to the nearest cell still here that
 * takes it (a cell a fold hides doesn't), else to the first control of the
 * grid's section (Popular's filter)
 */
function handOnFocus(cell: Element) {
  for (const each of neighboursOf(cell)) {
    const control = each.querySelector<HTMLElement>(FOCUSABLE);
    control?.focus();
    if (control && document.activeElement === control) {
      return;
    }
  }
  cell.closest('section')?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
}

/**
 * A grid folded to its first cells (Popular capped at 7) shows the next
 * one as a tile leaves: a cell folded away at the press waits at the
 * rise's start, so when the leaving tile goes and it comes into view, it
 * rises in (`GRID_ENTER`) rather than appearing at once. A cell still
 * folded rises unseen. Only on a press: a filter or Show all lands at once.
 */
function useRiseIntoView(
  ref: RefObject<HTMLDivElement | null>,
  moving: boolean,
) {
  const [waiting, setWaiting] = useState(false);
  useLayoutEffect(() => {
    const cell = ref.current;
    if (!moving) {
      setWaiting(false);
    } else if (cell && getComputedStyle(cell).display === 'none') {
      setWaiting(true);
    }
  }, [moving, ref]);
  return waiting ? 'waiting' : 'here';
}

function ExitCell({
  children,
  moving,
}: Readonly<{ children: ReactNode; moving: boolean }>) {
  const present = useIsPresent();
  const ref = useRef<HTMLDivElement>(null);
  // in the commit that makes it inert, before focus falls to the page
  useLayoutEffect(() => {
    const cell = ref.current;
    if (!present && cell?.contains(document.activeElement)) {
      handOnFocus(cell);
    }
  }, [present]);
  const variant = useRiseIntoView(ref, moving);
  const layout = moving ? 'position' : false;
  return (
    <m.div
      animate={variant}
      className={CELL}
      exit="gone"
      inert={!present}
      initial={false}
      layout={layout}
      ref={ref}
      transition={GRID_TRANSITION}
      variants={VARIANTS}
    >
      {children}
    </m.div>
  );
}

/**
 * A grid whose items leave on the viewer's own press (`leave`, handed to
 * `renderItem`; Popular's Add): the item fades and shrinks out and the rest
 * FLIP to their cells (`gridExit`, as the Library's tiles leave), and focus
 * moves to the item after it, else the one before, else the first control
 * of the grid's `section`. Any other change (a
 * filter typed, Show fewer) lands at once. `empty` takes the grid's place
 * once its last item has gone.
 */
export default function ExitGrid<T>({
  className,
  empty,
  items,
  keyOf,
  onLeave,
  renderItem,
}: Readonly<{
  className: string;
  empty: ReactNode;
  items: ReadonlyArray<T>;
  keyOf: (item: T) => Key;
  /** The press that takes `item` out of `items` */
  onLeave: (item: T) => void;
  /** `leave` is stable: a memoised item keeps its render */
  renderItem: (item: T, leave: (item: T) => void) => ReactNode;
}>) {
  // From a press until its exit is done: only then the cells measure
  const [moving, setMoving] = useState(false);
  const leave = useCallback(
    (item: T) => {
      setMoving(true);
      onLeave(item);
    },
    [onLeave],
  );
  const settled = useCallback(() => setMoving(false), []);
  if (items.length === 0 && !moving) {
    return empty;
  }
  return (
    <MaxMotion>
      <div className={className}>
        <AnimatePresence custom={moving} onExitComplete={settled}>
          {items.map((item) => (
            <ExitCell key={keyOf(item)} moving={moving}>
              {renderItem(item, leave)}
            </ExitCell>
          ))}
        </AnimatePresence>
      </div>
    </MaxMotion>
  );
}
