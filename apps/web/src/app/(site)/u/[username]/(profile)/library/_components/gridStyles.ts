import type { CSSProperties } from 'react';

/**
 * The Library's grid, shared by the tiles and their
 * ghosts so both lay out the same cells: about the board's 158px tile
 * wherever the column allows. 5 columns in the 852px main column and in a
 * tablet's full-width one from 900 (836px and up), 4 below (704px at 768)
 * and in the 596px column beside the sidebar at 1024, 3 on a phone; 28 × 16
 * apart (20 × 12 on a phone).
 */
export const LIBRARY_GRID =
  'grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:gap-x-4 md:gap-y-7 min-[900px]:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5';

/** One cell: skipped until near (`content-visibility`), sized like a tile */
export const LIBRARY_CELL =
  'min-w-0 [contain-intrinsic-size:auto_300px] [content-visibility:auto]';

/** A first page: 24 tiles, the API's page */
export const FIRST_PAGE = 24;

/** The tile's real width per breakpoint */
export const TILE_SIZES =
  '(min-width: 1280px) 158px, (min-width: 1024px) 14vw, (min-width: 900px) 18vw, (min-width: 768px) 24vw, (min-width: 640px) 23vw, 31vw';

/** The first ten posters load at once */
export const EAGER = 10;

/** A tile's poster: 10px corners, the deeper shadow */
export const POSTER_VARS = {
  '--tile-radius': '10px',
  '--tile-shadow': '0 10px 24px -8px rgb(0 0 0 / 0.7)',
} as CSSProperties;
