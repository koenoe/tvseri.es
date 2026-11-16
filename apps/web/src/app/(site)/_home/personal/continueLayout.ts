import type {
  LaneRowGhostLayout,
  LaneRowLayout,
} from '@/components/lane-row/laneRowLayout';
import { SEGMENT_CLASS, SEGMENT_OFF } from '@/components/ui/progress/Segments';
import cn from '@/lib/cn';
import { PAGE_COLUMN } from '../frame';

/**
 * Continue watching's layout, shared by the loaded section
 * (`ContinueWatching`, `InProgressLane`, `InProgressRow`) and its placeholder
 * (`ContinueGhost`), so the placeholder's ghosts sit where the content lands
 * and the two cannot drift. The Up next card's own boxes are the shared
 * card's (`components/up-next/upNextLayout.ts`).
 * A plain module (no `'use client'`): the server-rendered placeholder reads
 * these as strings.
 */

/** The section: the page column, the title row over the grid */
export const CONTINUE_SECTION = cn(
  PAGE_COLUMN,
  'flex flex-col gap-[22px] md:gap-6',
);

/** The title row: "Continue watching" and, from md, the 36px "Your profile" */
export const CONTINUE_HEAD = 'flex min-h-8 items-center gap-5';

export const CONTINUE_TITLE = 'truncate text-title-2 text-white';

export const CONTINUE_WATCHING_TITLE = 'Continue watching';

export const PROFILE_LABEL = 'Your profile';

/** The title row's "Your profile" (from md; the phone has it under the grid) */
export const PROFILE_BUTTON_HEAD = '-my-1.5 ml-auto max-md:hidden';

/** The phone's "Your profile" under the tile or the lane */
export const PROFILE_BUTTON_PHONE = 'self-start md:hidden';

/**
 * The Up next card beside the In progress lane (stacked below 1024). The one
 * column is `minmax(0, 1fr)`: the row sizes the tile and the lane, never
 * their content (an implicit `auto` column took a long nowrap title's width)
 */
export const continueGrid = (hasLane: boolean) =>
  cn(
    'grid grid-cols-1 gap-3 md:gap-6',
    hasLane && 'lg:grid-cols-[minmax(0,1fr)_440px] lg:items-stretch',
  );

/** The lane shows three compact rows under its head; the phone one */
export const LANE_ROWS = 3;

/** The In progress lane's cyan dot (the panel and head: `HOME_LANE`) */
export const LANE_DOT = 'size-2 shrink-0 rounded-full bg-cyan';

export const LANE_TITLE_TEXT = 'In progress';

/** The phone shows the lane's first row only */
export const LANE_ROW_PHONE_HIDDEN = 'max-md:hidden';

const LANE_POSTER_BOX = 'aspect-[2/3] w-12 shrink-0 rounded-6';

export const LANE_POSTER = cn(
  LANE_POSTER_BOX,
  'object-cover shadow-[0_8px_16px_-8px_rgb(0_0_0/0.8)]',
);

/** A row without a poster: the poster's place, empty */
export const LANE_POSTER_EMPTY = cn(LANE_POSTER_BOX, 'bg-white/8');

/** A compact lane row */
const LANE_ROW =
  'relative flex items-center gap-4 rounded-12 bg-white/4 p-3 md:p-3.5';

/**
 * In progress's rows on the shared lane row (`components/lane-row`). Each place keeps its own look on purpose; don't unify them.
 */
export const IN_PROGRESS_ROW: LaneRowLayout = {
  code: 'home',
  count: 'text-caption whitespace-nowrap text-white/60 tabular-nums',
  // the meta line 10px under the segments (6px gap + 4px): the code badge
  // and its line get the air, the row keeps its height
  meta: 'mt-1 gap-2.5',
  row: LANE_ROW,
  // title and "2 to go", the segments 6px under them
  text: 'flex min-w-0 flex-1 flex-col gap-1.5',
  title: 'truncate text-body-sm font-semibold text-white',
  titleLine: 'flex items-baseline justify-between gap-2.5',
};

/** The rows' placeholder: the row's box (the grid pulses), empty segments */
export const IN_PROGRESS_ROW_GHOST: LaneRowGhostLayout = {
  row: LANE_ROW,
  segment: cn(SEGMENT_CLASS, SEGMENT_OFF),
};

/** Home's ⋯ on the Up next card and the rows: white glyph, a 2px white/20 ring, hover brightens only the ring */
export const CONTINUE_REMOTE =
  'bg-transparent text-white hover:bg-transparent aria-expanded:bg-transparent';

/** The ⋯ at the row's end, above the row */
export const LANE_REMOTE = 'relative z-1';
