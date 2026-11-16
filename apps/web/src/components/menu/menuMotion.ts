import type { Variants } from 'motion/react';

import { STANDARD_EASE as EASE } from '@/components/motion/ease';

/*
 * Transform and opacity only, the blur set once and never
 * animated. Every part of the open menu takes the labels `hidden`, `visible`
 * and `exit` from the dialog (AnimatePresence).
 */

const EASE_IN = [0.42, 0, 1, 1] as const;

/** Phone: the glass fades in over 200ms and out over 160ms */
export const phoneGlassVariants: Variants = {
  exit: { opacity: 0, transition: { duration: 0.16, ease: EASE_IN } },
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: EASE } },
};

/**
 * Phone: each word rises 14px and fades in over 180ms, from the bottom up,
 * 30ms apart (`custom` = its place counted from the bottom; a group's label
 * comes with the word under it); all go out together in 120ms.
 */
export const phoneWordVariants: Variants = {
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE_IN } },
  hidden: { opacity: 0, y: 14 },
  visible: (fromBottom: number) => ({
    opacity: 1,
    transition: { delay: fromBottom * 0.03, duration: 0.18, ease: EASE },
    y: 0,
  }),
};

/** Desktop: the word lists fade in 60ms after the panel starts, over 160ms */
export const panelListVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delay: 0.06, duration: 0.16 } },
};

export const MENU_ID = 'site-menu';
