import type { MotionStyle, TargetAndTransition, Variants } from 'motion/react';

import { SHEET_EASE, STANDARD_EASE } from '@/components/motion/ease';

export type PanelMotion = Readonly<{
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  initial: TargetAndTransition;
  /**
   * Motion values for the panel (the episode modal drives its scale through
   * them, so the content can follow frame by frame).
   */
  style?: MotionStyle;
  /** Motion values for a wrapper around the panel's content. */
  contentStyle?: MotionStyle;
}>;

/*
 * Exits ease out like the enters: an ease-in sits still at the start, so a
 * close would feel late.
 */

/** Phones: every dialog slides up 24px and fades. */
export const PHONE_MOTION: PanelMotion = {
  animate: {
    opacity: 1,
    transition: { duration: 0.24, ease: SHEET_EASE },
    y: 0,
  },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeOut' }, y: 24 },
  initial: { opacity: 0, y: 24 },
};

/** A fade and an 8px rise over 200ms */
export const CENTER_MOTION: PanelMotion = {
  animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' }, y: 0 },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeOut' }, y: 8 },
  initial: { opacity: 0, y: 8 },
};

/** How long a desktop side panel takes to leave; its scrim leaves with it */
const SIDE_EXIT = { duration: 0.2, ease: SHEET_EASE } as const;

/**
 * Every desktop side panel (the watch-history sheet, the menu, the awards
 * sheet) slides in from the right edge: 260ms on the sheet curve,
 * out in 200ms.
 */
export const SIDE_MOTION: PanelMotion = {
  animate: { transition: { duration: 0.26, ease: SHEET_EASE }, x: 0 },
  exit: { transition: SIDE_EXIT, x: '100%' },
  initial: { x: '100%' },
};

/** Its scrim (`BACKDROP.side`) fades in over 200ms and out with the panel */
export const SIDE_SCRIM_MOTION: PanelMotion = {
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: STANDARD_EASE },
  },
  exit: { opacity: 0, transition: SIDE_EXIT },
  initial: { opacity: 0 },
};

/** A panel motion as variants, for a part that takes its labels from a parent */
export const toVariants = (motion: PanelMotion): Variants => ({
  exit: motion.exit,
  hidden: motion.initial,
  visible: motion.animate,
});

/**
 * The episode modal: scales in on a spring with no bounce (an overshoot
 * reads as a wobble on a panel this large). The grow from the tile itself
 * is a shared layout animation the episode wall adds; the shell scales in
 * on its own.
 */
export const LARGE_MOTION: PanelMotion = {
  animate: {
    opacity: 1,
    scale: 1,
    transition: { bounce: 0, duration: 0.45, type: 'spring' },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.16, ease: 'easeOut' },
  },
  initial: { opacity: 0, scale: 0.96 },
};

/** The dim fades in over 300ms */
export const BACKDROP_MOTION: PanelMotion = {
  animate: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeOut' } },
  initial: { opacity: 0 },
};
