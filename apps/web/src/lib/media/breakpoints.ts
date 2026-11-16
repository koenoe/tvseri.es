/**
 * The breakpoints script reads, as media queries, in one place. They are
 * Tailwind's `md` (48rem, 768px: `max-md:` is the phone layout), `sm`
 * (40rem, 640px: dialogs become bottom sheets) and `lg` (64rem, 1024px: the
 * sidebars appear, the episode modal goes side by side), so script and CSS
 * switch at the same pixel. Range syntax, so a fractional width (767.5px) falls on
 * the same side as in CSS. The reduced-motion query sits here too. Read them
 * with `useMediaQuery` (`matchesNow` for a one-off read).
 */

/** Below `md`: the phone layout */
export const PHONE = '(width < 48rem)';

/** `md` and up */
export const WIDE = '(width >= 48rem)';

/** Below `sm`: a dialog is a bottom sheet */
export const SMALL_PHONE = '(width < 40rem)';

/**
 * `lg` (64rem, 1024px) and up: the profile, Stats and Settings sidebars
 * (below it those pages use the phone's shell), the episode modal's
 * side-by-side layout
 */
export const WIDE_LG = '(width >= 64rem)';

/** The reader asked for reduced motion: jump, don't animate */
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
