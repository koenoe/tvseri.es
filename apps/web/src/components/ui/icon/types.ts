import type { ReactElement } from 'react';

/** One glyph, drawn on the 24-unit grid. */
export type Glyph = Readonly<{
  filled?: undefined;
  outline: ReactElement;
}>;

/** A glyph with an "on" drawing: watched, watchlist, favourite, rating, follow. */
export type ToggleGlyph = Readonly<{
  filled: ReactElement;
  outline: ReactElement;
}>;

/** The family's steps, plus odd sizes some layouts need (11, 12, 14, 15, 18, 22) */
export type IconSize = 11 | 12 | 13 | 14 | 15 | 16 | 18 | 20 | 22 | 24;
