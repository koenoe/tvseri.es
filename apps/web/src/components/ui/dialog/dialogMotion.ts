import type {
  MotionStyle,
  TargetAndTransition,
  Transition,
  Variants,
} from 'motion/react';

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

/** Phones: every dialog slides up 24px and fades (remote_style.md §9). */
export const PHONE_MOTION: PanelMotion = {
  animate: {
    opacity: 1,
    transition: { duration: 0.24, ease: SHEET_EASE },
    y: 0,
  },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeIn' }, y: 24 },
  initial: { opacity: 0, y: 24 },
};

/** `dlg-in .2s ease-out` (fade, 8px rise). */
export const CENTER_MOTION: PanelMotion = {
  animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' }, y: 0 },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' }, y: 8 },
  initial: { opacity: 0, y: 8 },
};

/** How long a desktop side panel takes to leave; its scrim leaves with it */
const SIDE_EXIT = { duration: 0.2, ease: [0.32, 0, 0.67, 0] } as const;

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
 * The episode modal: a grow curve (`v2-grow .62s
 * cubic-bezier(.22,1.1,.36,1)`). The grow from the tile itself is a shared
 * layout animation the episode wall adds; the shell scales in on its own.
 */
export const LARGE_MOTION: PanelMotion = {
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1.1, 0.36, 1] },
  },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.16 } },
  initial: { opacity: 0, scale: 0.96 },
};

/** the dim fades in over .3s. */
export const BACKDROP_MOTION: PanelMotion = {
  animate: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
  initial: { opacity: 0 },
};
