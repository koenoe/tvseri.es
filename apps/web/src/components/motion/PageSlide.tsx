'use client';

import { AnimatePresence, useIsPresent, type Variants } from 'motion/react';
import * as m from 'motion/react-m';
import type { Key, ReactNode, Ref } from 'react';

import cn from '@/lib/cn';

import { SHEET_EASE } from './ease';

/**
 * A page change with arrows (the calendar's month, a ranked list's ten, a
 * date picker's month): the new page slides 40px in from the way you travel
 * and fades in over 280ms; the old one slides 40px the other way and fades
 * in 200ms. They overlap, so quick presses interrupt cleanly. `direction`
 * is 1 forward, -1 back.
 */
export const PAGE_SLIDE: Variants = {
  center: {
    opacity: 1,
    transition: { duration: 0.28, ease: SHEET_EASE },
    x: 0,
  },
  enter: (direction: number) => ({ opacity: 0, x: direction * 40 }),
  exit: (direction: number) => ({
    opacity: 0,
    transition: { duration: 0.2, ease: SHEET_EASE },
    x: direction * -40,
  }),
};

/** The page's heading (and its count): 10px up or down instead */
export const PAGE_HEAD: Variants = {
  center: {
    opacity: 1,
    transition: { duration: 0.24, ease: SHEET_EASE },
    y: 0,
  },
  enter: (direction: number) => ({ opacity: 0, y: direction * 10 }),
  exit: (direction: number) => ({
    opacity: 0,
    transition: { duration: 0.14, ease: 'easeOut' },
    y: direction * -6,
  }),
};

const PAGE = { div: m.div, ol: m.ol, tbody: m.tbody } as const;

type Props = Readonly<{
  /** The page's own element: `ol` for a list's page, `tbody` for a table's weeks */
  as?: keyof typeof PAGE;
  children: ReactNode;
  className?: string;
  /** 1 forward, -1 back */
  direction: number;
  /** A new key is a new page */
  pageKey: Key;
  /** `PAGE_SLIDE` (the default) or `PAGE_HEAD` */
  variants?: Variants;
}>;

/** Any of the page's elements: `popLayout` measures the leaving one through it */
type PageRef = Ref<HTMLDivElement & HTMLOListElement & HTMLTableSectionElement>;

/** The page leaving is out of reach while it slides away: no press, no reading */
function Page({
  as = 'div',
  children,
  className,
  direction,
  ref,
  variants,
}: Omit<Props, 'pageKey'> & Readonly<{ ref?: PageRef; variants: Variants }>) {
  const leaving = !useIsPresent();
  const Element = PAGE[as];
  const classes = cn(className, leaving && 'pointer-events-none');
  return (
    <Element
      animate="center"
      aria-hidden={leaving || undefined}
      className={classes}
      custom={direction}
      exit="exit"
      initial="enter"
      ref={ref}
      variants={variants}
    >
      {children}
    </Element>
  );
}

/**
 * One page of something paged with arrows, sliding the way you travel
 * (`PAGE_SLIDE`, or `PAGE_HEAD` for its heading) when `pageKey` changes.
 * The leaving page is taken out of the flow (`popLayout`), so its parent
 * must be positioned. Nothing moves on the first render; with reduced
 * motion only the fade stays (`MotionProvider`).
 */
export default function PageSlide({
  pageKey,
  variants = PAGE_SLIDE,
  ...page
}: Props) {
  return (
    <AnimatePresence custom={page.direction} initial={false} mode="popLayout">
      <Page key={pageKey} variants={variants} {...page} />
    </AnimatePresence>
  );
}
