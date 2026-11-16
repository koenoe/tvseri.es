/**
 * "New this week"'s geometry, shared by the row and its placeholder. The
 * row is a poster row (`tiles="poster"`) whose first tile, the lead, is a
 * backdrop as tall as the posters: 16:9 at the posters' height where the
 * row is wide (8/3 of a poster's width, 585 × 330 beside 220 × 330 at
 * 1440). On phones 16:9 would fill the screen and hide the posters after
 * it, so there the lead leaves the next poster a 24px peek past the gap
 * (322 × 210 at 390, about 82% of the row).
 */

export const ID = 'new-this-week';
export const TITLE = 'New this week';

export const LEAD_WIDTH =
  'w-[min(calc(var(--row-tile)*8/3),calc(100cqw_-_var(--row-start)_-_var(--row-gap)_-_24px))]';

/** A poster's height (2:3 of the row's tile width) */
export const LEAD_HEIGHT = 'h-[calc(var(--row-tile)*3/2)]';

/** The widest the lead gets per viewport (645 at 1679, 546 at 767; about 85% on phones) */
export const LEAD_SIZES = '(min-width: 640px) 650px, 85vw';

/** A tile and the line under it: 8px apart, 12 on desktop, as under a poster */
export const LEAD_COLUMN = 'flex flex-col gap-2 md:gap-3';
