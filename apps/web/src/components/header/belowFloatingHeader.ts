/*
 * A sticky element moves down out of the way while the floating header pill
 * is shown, in step with the pill (HeaderFrame: 300 ms on its curve), and
 * back up when the pill hides. The pill ends 80px from the top on desktop
 * (24 + 56) and 68px on a phone (12 + 56); a sticky column at 32px moves
 * 64px, so 16px clear the pill. `transform` only, on the compositor.
 *
 * A page that opens while the pill of the page before it is still shown (a
 * link pressed on a scrolled page) would draw the element moved down and
 * slide it up as the header resets: for its first 400 ms on screen it is
 * held in place (`sticky-settle` in globals.css), by when the header has
 * reset and the move underneath has finished.
 *
 * One string per breakpoint the element is sticky at, so it never moves
 * where it scrolls with the page. Full class strings, for Tailwind's scan.
 */

/** A desktop sidebar sticky from `lg` at `top-8` (profile, Stats, settings, person) */
export const BELOW_FLOATING_HEADER_LG =
  'lg:animate-[sticky-settle_400ms] lg:transition-transform lg:duration-300 lg:ease-[cubic-bezier(.25,.1,.25,1)] lg:header-floating:translate-y-16';
