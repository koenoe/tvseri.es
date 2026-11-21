/**
 * The marks' fade: 150ms of opacity on Tailwind's default curve,
 * `cubic-bezier(.4, 0, .2, 1)`, on the compositor. Reduced motion makes it
 * instant (globals.css).
 */

/**
 * A mark drawn after the first paint (the viewer's Watched labels and
 * "You’ve seen N of M" lines, from the library ids that load after
 * hydration; a marking control streamed in over its ghost; a row's arrows
 * once its rail is measured) fades in
 * instead of popping. It runs when the element is inserted
 * (`@starting-style`), so put it on an element that mounts with the mark,
 * never on one that is there from the first paint.
 */
export const LATE_FADE = 'transition-opacity duration-150 starting:opacity-0';

/**
 * Two layers in one place that swap (a marking control's states): the one
 * leaving fades out and only then becomes hidden, the one arriving is
 * visible at once and fades in.
 */
export const CROSSFADE = 'transition-[opacity,visibility] duration-150';
