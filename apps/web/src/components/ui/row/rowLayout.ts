/**
 * The row's geometry as CSS variables, shared by Row, RowSkeleton and
 * RowError so a fallback takes exactly the space the loaded row will.
 *
 * - `--row-start` / `--row-end`: the gutters. The first card snaps to
 *   `--row-start` (the page's text edge); the rail bleeds past `--row-end`.
 * - `--row-n` + `--row-peek`: cards fully visible + the share of the next one
 *   cut at the right edge ("5 full + 49% of the 6th" at 1440).
 * - `--row-gap`, `--tile-radius`, `--tile-aspect`.
 * - `--row-tile`: the card width that follows from those, so the peek holds
 *   at every width.
 *
 * The frame is an inline-size container, so `cqw` is the row's own width and
 * the counts follow the space the row gets (full bleed or a column), not the
 * window. Example values: a full row (220 + 24, gutter 112 at 1440), the
 * profile column (160 + 16, 5 + 52%), a phone (140 + 12, 2.45 at 390; the
 * phone gutter is 24), Home's 16:9 tile (384 + 24,
 * 3 + 27% at 1440).
 */

export type RowTiles =
  | 'backdrop'
  | 'card'
  | 'poster'
  | 'posterCompact'
  | 'ranked';

/** `page`: a full-bleed row on the page grid. `column`: a row inside a page column (profile main column) that clips at the column's left edge and bleeds to the window's right edge. `flush`: a section inside a column that already has the page gutter at every width (the person page, Stats): its edges are the column's. */
export type RowInset = 'column' | 'flush' | 'page';

export const ROW_TILE_WIDTH =
  '[--row-tile:calc((100cqw_-_var(--row-start)_-_var(--row-n)_*_var(--row-gap))_/_(var(--row-n)_+_var(--row-peek)))]';

export const ROW_INSET: Readonly<Record<RowInset, string>> = {
  // the page gutter (`--gutter`); the page: 1280px wide with 32px padding, so 112px at 1440
  // the rail's clip moves 8px out from md, so a hovered first tile's grow isn't cut (Row)
  column:
    '[--row-start:var(--page-gutter)] [--row-end:var(--page-gutter)] md:[--row-start:0px] md:[--row-bleed:8px] md:[--row-end:max(var(--page-gutter),calc((100vw_-_1280px)/2_+_var(--page-gutter)))]',
  flush: '[--row-start:0px] [--row-end:0px]',
  page: '[--row-start:max(var(--page-gutter),calc((100cqw_-_1280px)/2_+_var(--page-gutter)))] [--row-end:max(var(--page-gutter),calc((100cqw_-_1280px)/2_+_var(--page-gutter)))]',
};

export const ROW_TILES: Readonly<Record<RowTiles, string>> = {
  backdrop:
    '[--row-n:1] [--row-peek:0.25] [--row-gap:12px] [--tile-radius:12px] [--tile-aspect:16/9] @min-[640px]:[--row-n:2] @min-[768px]:[--row-peek:0.27] @min-[768px]:[--row-gap:16px] @min-[1024px]:[--row-n:3] @min-[1024px]:[--row-gap:24px] @min-[1680px]:[--row-n:4]',
  /** The Discover hub's Go deeper card: one at a time on phones inside both page gutters (342 at 390), 960 + 40% of the next at 1440; between them (768 to 1279) the phone's stacked card at 560px with the next one peeking, because the desktop card squeezes its posters below about 900px (29px posters at 800); the ghost is the card's height (303 on phones, 404 stacked at 560, 310 with a two-line "why" on desktop, measured on the loaded card) */
  card: '[--row-n:1] [--row-peek:0] [--row-gap:12px] [--tile-radius:16px] [--tile-aspect:auto] [--tile-ghost-h:303px] @max-[767px]:[--row-tile:calc(100cqw_-_2_*_var(--page-gutter))] @min-[768px]:@max-[1280px]:[--row-tile:560px] @min-[768px]:[--tile-ghost-h:404px] @min-[768px]:[--row-gap:24px] @min-[1280px]:[--tile-ghost-h:310px] @min-[1280px]:[--row-peek:0.36]',
  poster:
    '[--row-n:2] [--row-peek:0.45] [--row-gap:12px] [--tile-radius:10px] [--tile-aspect:2/3] @max-[639px]:[--row-tile:140px] @min-[640px]:[--row-n:3] @min-[768px]:[--row-n:4] @min-[768px]:[--row-peek:0.49] @min-[768px]:[--row-gap:16px] @min-[768px]:[--tile-radius:12px] @min-[1024px]:[--row-n:5] @min-[1024px]:[--row-gap:24px] @min-[1680px]:[--row-n:6] @min-[2200px]:[--row-n:7]',
  posterCompact:
    '[--row-n:2] [--row-peek:0.45] [--row-gap:12px] [--tile-radius:10px] [--tile-aspect:2/3] @min-[480px]:[--row-n:3] @min-[480px]:[--row-peek:0.52] @min-[480px]:[--row-gap:16px] @min-[640px]:[--row-n:4] @min-[880px]:[--row-n:5] @min-[1200px]:[--row-n:6]',
  /**
   * The numbered row: a tile is the
   * numeral's room and the poster, 290 = 110 + 180 at 1024 and up, 18 apart
   * (the frame's 308 pitch); below that numeral and poster scale together
   * with the tile (`RankedTile`), 2 + 45% on phones like the poster rows, 3
   * + 45% from 640. The poster is 62% of the tile (180 of 290), 72% on
   * phones, where it is bigger and covers more of the numeral
   * (`--ranked-poster`). The ghost draws the poster only, at its place
   * (`--tile-ghost-inset`: what the numeral keeps).
   */
  ranked:
    '[--row-n:2] [--row-peek:0.45] [--row-gap:12px] [--tile-radius:10px] [--tile-aspect:2/3] [--ranked-poster:0.72] [--tile-ghost-inset:28%] @min-[640px]:[--ranked-poster:0.62069] @min-[640px]:[--tile-ghost-inset:37.931%] @min-[640px]:[--row-n:3] @min-[768px]:[--row-gap:16px] @min-[1024px]:[--row-tile:290px] @min-[1024px]:[--row-gap:18px]',
};

/**
 * `sizes` for the images in each kind of row: the widest card per viewport
 * range (the TMDB loader picks the TMDB size from it).
 */
export const ROW_IMAGE_SIZES: Readonly<Record<RowTiles, string>> = {
  backdrop: '(min-width: 640px) 422px, 80vw',
  card: '(min-width: 768px) 170px, 30vw',
  poster:
    '(min-width: 768px) 242px, (min-width: 640px) 207px, calc((100vw - 48px) / 2.45)',
  posterCompact: '(min-width: 768px) 205px, calc((100vw - 48px) / 2.45)',
  /** the poster is 62% of the tile (180 of 290), 72% on phones */
  ranked:
    '(min-width: 1024px) 180px, (min-width: 640px) calc((100vw - 80px) * 0.18), calc((100vw - 48px) * 0.3)',
};

/**
 * A page's own look for the shared row and tile, as tokens (no fork): set
 * on a wrapper inside the frame, so they win over the tile grid's values.
 * The tokens and their defaults:
 *
 * - `--row-head-h` (none), `--row-head-gap` (20px), `--row-rail-pt` (24px):
 *   the header line's height and gap, and header → cards.
 * - `--row-meta-icon` (13px): the header's subtitle icon.
 * - `--row-arrow-stroke` (1.8), `--row-arrow-ink` (white/80): the arrows.
 *   Home and Discover use stroke 2 (`home`, the hub looks).
 * - `--tile-shadow` (the soft drop shadow), `--tile-focus-offset` (4px): the
 *   poster tile.
 */
export type RowLook =
  | 'home'
  | 'hub'
  | 'hubOpen'
  | 'hubPoster'
  | 'hubRanked'
  | 'landing';

// The arrows' chevron at stroke 2
const BOARD_ARROWS = '[--row-arrow-stroke:2]';

// a 44px header line with 14px gaps, the track's 6px below
// the cards; white chevrons
const HUB_LINE = `${BOARD_ARROWS} [--row-arrow-ink:#fff] md:[--row-head-h:44px] md:[--row-head-gap:14px] md:pb-1.5`;

/** The Discover hub's poster shadow, for hub posters outside a row too */
export const HUB_TILE_SHADOW =
  '[--tile-shadow:0_10px_24px_-8px_rgb(0_0_0/0.7)]';

// the hub's posters: r10 and the deep shadow at every width, 132px on phones
const HUB_POSTERS = `${HUB_TILE_SHADOW} [--tile-radius:10px] @max-[639px]:[--row-tile:132px]`;

export const ROW_LOOKS: Readonly<Record<RowLook, string>> = {
  /** Home: the arrows' chevron at stroke 2 */
  home: BOARD_ARROWS,
  /** a hub section: 24 + the track's 4px from the header to the cards */
  hub: `${HUB_LINE} md:[--row-rail-pt:28px]`,
  /** a lens tile's row opened in place: 16 + 4 */
  hubOpen: `${HUB_LINE} md:[--row-rail-pt:20px] ${HUB_POSTERS}`,
  hubPoster: `${HUB_LINE} md:[--row-rail-pt:28px] ${HUB_POSTERS}`,
  /** the hub's numbered row: its posters' shadow, the tile sizes its own (`ranked`) */
  hubRanked: `${HUB_LINE} md:[--row-rail-pt:28px] ${HUB_TILE_SHADOW}`,
  /** the landings: 14px header icons, a 2px focus offset, no poster shadow on phones */
  landing: `${BOARD_ARROWS} [--row-meta-icon:14px] [--tile-focus-offset:2px] max-md:[--tile-shadow:none]`,
};
