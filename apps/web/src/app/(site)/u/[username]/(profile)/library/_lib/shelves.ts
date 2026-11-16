import {
  type BulkLibraryOp,
  LIBRARY_SORTS,
  type LibraryShelf,
  type LibrarySort,
} from '@tvseri.es/schemas';

import {
  bookmarkGlyph,
  completeGlyph,
  heartGlyph,
  hideGlyph,
  progressGlyph,
  showGlyph,
  trashGlyph,
  undoGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';

type Action = Readonly<{
  glyph: Glyph | ToggleGlyph;
  label: string;
  /** A bulk action on a shelf's selection */
  op: BulkLibraryOp;
  /** The phone's action bar */
  short: string;
}>;

export type ShelfMeta = Readonly<{
  /** The shelf nav's and the header's name ("All shows") */
  label: string;
  /** The phone chip's name ("All") */
  chip: string;
  glyph: Glyph | ToggleGlyph;
  /** The owner's line under the header (the board's `META.desc`) */
  description: string;
  /** What a visitor's line calls the shelf: "edw1n’s favourites" */
  visitorNoun: string;
  /** The one action on a selection; none on All (mixed states) */
  action: Action | null;
}>;

/**
 * The six shelves, in the nav's order. The board's mock
 * notes ("No cap: today's page stops at 10", a count in All's line) are left
 * out: the line is static in the shell.
 */
export const SHELVES: Readonly<Record<LibraryShelf, ShelfMeta>> = {
  all: {
    action: null,
    chip: 'All',
    description:
      'Everything you’ve touched, each series once, across the shelves.',
    glyph: showGlyph,
    label: 'All series',
    visitorNoun: 'series, each one once',
  },
  favourites: {
    action: {
      glyph: trashGlyph,
      label: 'Remove from favourites',
      op: 'favourites-remove',
      short: 'Remove',
    },
    chip: 'Favourites',
    description: 'The series you love. The first five lead your overview.',
    glyph: heartGlyph,
    label: 'Favourites',
    visitorNoun: 'favourites',
  },
  finished: {
    action: {
      glyph: heartGlyph,
      label: 'Add to favourites',
      op: 'favourites-add',
      short: 'Favourite',
    },
    chip: 'Finished',
    description:
      'Every series watched to its last aired episode. Returning ones also wait in Waiting for.',
    glyph: completeGlyph,
    label: 'Finished',
    visitorNoun: 'finished series',
  },
  hidden: {
    action: {
      glyph: undoGlyph,
      label: 'Back to in progress',
      op: 'unhide',
      short: 'Unhide',
    },
    chip: 'Hidden',
    description:
      'Series you hid from in progress. They stay out of every block until you bring them back.',
    glyph: hideGlyph,
    label: 'Hidden',
    visitorNoun: 'hidden series',
  },
  watching: {
    action: {
      glyph: hideGlyph,
      label: 'Hide from in progress',
      op: 'hide',
      short: 'Hide',
    },
    chip: 'Watching',
    description: 'Every series you’re in the middle of, last watched first.',
    glyph: progressGlyph,
    label: 'Watching',
    visitorNoun: 'series in progress',
  },
  watchlist: {
    action: {
      glyph: trashGlyph,
      label: 'Remove from watchlist',
      op: 'watchlist-remove',
      short: 'Remove',
    },
    chip: 'Watchlist',
    description:
      'Saved and not started. A series leaves when you start it. Oldest first is the pruning view.',
    glyph: bookmarkGlyph,
    label: 'Watchlist',
    visitorNoun: 'watchlist',
  },
};

/** The sort pill's labels (the board's `META.sorts`) */
const SORT_LABEL: Readonly<Record<LibrarySort, string>> = {
  active: 'Recently active',
  az: 'A–Z',
  last: 'Last watched',
  left: 'Most left',
  newest: 'Newest added',
  oldest: 'Oldest added',
  recent: 'Recently added',
};

/** "Recently finished" / "Recently added" / "Recently hidden": `recent` per shelf */
export function sortLabel(shelf: LibraryShelf, sort: LibrarySort): string {
  if (sort === 'recent') {
    return shelf === 'finished'
      ? 'Recently finished'
      : shelf === 'hidden'
        ? 'Recently hidden'
        : SORT_LABEL.recent;
  }
  return SORT_LABEL[sort];
}

/** The shelf's sorts, the default first */
export const sortsOf = (shelf: LibraryShelf): ReadonlyArray<LibrarySort> =>
  LIBRARY_SORTS[shelf];

/**
 * A visitor's line: "edw1n’s favourites. The green ones
 * are new to you: + saves one to your watchlist."
 */
export const visitorDescription = (shelf: LibraryShelf, username: string) =>
  `${username}’s ${SHELVES[shelf].visitorNoun}. The green ones are new to you: + saves one to your watchlist.`;

const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five'];

/** "Shows you’ve watched to the end. You marked these two as seen in Get started." */
export function seenOnlyLine(count: number): string {
  const these =
    count === 1 ? 'this one' : `these ${NUMBER_WORDS[count] ?? count}`;
  return `Series you’ve watched to the end. You marked ${these} as seen in Get started.`;
}
