import type { PanelMotion } from '@/components/ui/dialog/dialogMotion';

type Box = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}>;
type Viewport = Readonly<{ width: number; height: number }>;

/** .62s cubic-bezier(.22,1.1,.36,1). */
const GROW_EASE = [0.22, 1.1, 0.36, 1] as const;
/** The close: .36s cubic-bezier(.4,0,.2,1). */
const SHRINK_EASE = [0.4, 0, 0.2, 1] as const;

/** The modal's box: 1320 × 880, 24px clear of the viewport (LargeDialog). */
export function panelSize(viewport: Viewport) {
  return {
    height: Math.min(880, viewport.height - 48),
    width: Math.min(1320, viewport.width - 48),
  };
}

/** Where the centred panel must be moved and scaled to cover `origin`. */
function onto(origin: Box, viewport: Viewport) {
  const panel = panelSize(viewport);
  return {
    scaleX: origin.width / panel.width,
    scaleY: origin.height / panel.height,
    x: origin.left + origin.width / 2 - viewport.width / 2,
    y: origin.top + origin.height / 2 - viewport.height / 2,
  };
}

/**
 * The card grows from the tile's box into the modal with transform only
 * (no left/top/width/height animation): the panel starts scaled onto the
 * tile's exact box and grows to its place. The content keeps its
 * proportions (`coverContent`) frame by frame. The shell is opaque
 * throughout; the content fades in after (`EpisodeView`'s `FADE_IN`).
 */
export function growFrom(origin: Box, viewport: Viewport): PanelMotion {
  return {
    animate: {
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
      transition: { duration: 0.62, ease: GROW_EASE },
      x: 0,
      y: 0,
    },
    exit: shrinkTo(origin, viewport),
    initial: { opacity: 1, ...onto(origin, viewport) },
  };
}

/** Closing: back onto the tile's box, fading out at the end. */
export function shrinkTo(origin: Box, viewport: Viewport): PanelMotion['exit'] {
  return {
    ...onto(origin, viewport),
    opacity: 0,
    transition: {
      default: { duration: 0.36, ease: SHRINK_EASE },
      opacity: { delay: 0.24, duration: 0.12, ease: 'linear' },
    },
  };
}

/**
 * The content's scale inside a panel scaled (`scaleX`, `scaleY`): one
 * uniform scale that covers the panel's box, as `object-fit: cover` does on
 * a resized shell, so the still is never stretched.
 */
export function coverContent(scaleX: number, scaleY: number) {
  const cover = Math.max(scaleX, scaleY);
  return { scaleX: cover / scaleX, scaleY: cover / scaleY };
}

/** A tile is a usable origin when it is on screen. */
export const isOnScreen = (box: Box, viewport: Viewport) =>
  box.width > 0 &&
  box.top < viewport.height &&
  box.top + box.height > 0 &&
  box.left < viewport.width &&
  box.left + box.width > 0;
