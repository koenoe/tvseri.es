/**
 * A panel that opens under the button that brought it (a `useMenu` menu,
 * the show's season popover) drops in: it fades in and comes down 4px in
 * 160ms on CSS's own `ease-out` (the season popover's signed-off curve).
 * CSS that plays when the panel is inserted (`@starting-style`), so it
 * takes no presence and no JavaScript; closing is at once, as a menu's is.
 * Only opacity and translate move: the season popover sets its own top and
 * height as it opens, and those must not glide. Reduced motion drops it
 * (the global rule in `globals.css`).
 */
export const PANEL_DROP =
  'transition-[opacity,translate] duration-160 ease-[ease-out] starting:-translate-y-1 starting:opacity-0';
