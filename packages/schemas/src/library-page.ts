/**
 * The profile Library: six shelves over one user's lists and
 * prefs. `GET /user/:id/library` (counts) and `GET /user/:id/library/:shelf`
 * (one page of a shelf).
 */

import * as v from 'valibot';

import { EpisodeCodeSchema } from './series-prefs';

/** The shelves, in the shelf nav's order. `hidden` is the owner's only */
export const LIBRARY_SHELVES = [
  'watching',
  'watchlist',
  'finished',
  'favourites',
  'all',
  'hidden',
] as const;

export const LibraryShelfSchema = v.picklist(LIBRARY_SHELVES);

export type LibraryShelf = v.InferOutput<typeof LibraryShelfSchema>;

/**
 * Each shelf's sorts, the default first:
 * - `last` "Last watched", `left` "Most left", `az` "A–Z" (The/A/An ignored)
 * - `newest` / `oldest` "Newest / Oldest added"
 * - `recent`: "Recently finished" / "Recently added" / "Recently hidden"
 * - `active` "Recently active"
 */
export const LIBRARY_SORTS = {
  all: ['active', 'az'],
  favourites: ['recent', 'az'],
  finished: ['recent', 'az'],
  hidden: ['recent', 'az'],
  watching: ['last', 'left', 'az'],
  watchlist: ['newest', 'oldest', 'az'],
} as const satisfies Readonly<
  Record<LibraryShelf, readonly [string, ...string[]]>
>;

export type LibrarySortOf<S extends LibraryShelf> =
  (typeof LIBRARY_SORTS)[S][number];

export type LibrarySort = LibrarySortOf<LibraryShelf>;

const LIBRARY_SORT_VALUES = [
  'last',
  'left',
  'az',
  'newest',
  'oldest',
  'recent',
  'active',
] as const satisfies ReadonlyArray<LibrarySort>;

/** Whether `sort` is one of the shelf's sorts */
export const isLibrarySortOf = <S extends LibraryShelf>(
  shelf: S,
  sort: string,
): sort is LibrarySortOf<S> =>
  (LIBRARY_SORTS[shelf] as ReadonlyArray<string>).includes(sort);

/** The visitor filters: `new` = in none of the viewer's lists; `shared` = in the viewer's finished, in progress or favourites */
export const LIBRARY_FILTERS = ['new', 'shared'] as const;

export type LibraryFilter = (typeof LIBRARY_FILTERS)[number];

/** The A–Z rail: `#` (digits and non-Latin titles, first) then a to z */
export const LIBRARY_LETTERS = [
  '#',
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
] as const;

/** Tiles per read (24) and the most a read may ask for */
export const LIBRARY_PAGE_SIZE = 24;

/** `q` after trimming */
export const LIBRARY_FIND_MAX = 100;

/** `cursor` / `before` */
export const LIBRARY_CURSOR_MAX = 512;

/**
 * `GET /user/:id/library/:shelf` query. Strict: anything off is a 400 (the
 * web parses its URL leniently and only sends valid values). `sort` is also
 * checked against the shelf's own set by the route.
 */
export const LibraryQuerySchema = v.pipe(
  v.object({
    before: v.optional(v.pipe(v.string(), v.maxLength(LIBRARY_CURSOR_MAX))),
    cursor: v.optional(v.pipe(v.string(), v.maxLength(LIBRARY_CURSOR_MAX))),
    /** Only with `sort=az`: start at this letter (`#` is sent as `%23`) */
    from: v.optional(v.pipe(v.string(), v.regex(/^[a-z#]$/))),
    limit: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^\d{1,2}$/, 'limit is 1 to 24'),
        v.transform(Number),
        v.minValue(1),
        v.maxValue(LIBRARY_PAGE_SIZE),
      ),
    ),
    q: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(LIBRARY_FIND_MAX))),
    sort: v.optional(v.picklist(LIBRARY_SORT_VALUES)),
    with: v.optional(v.picklist(LIBRARY_FILTERS)),
  }),
  v.check(
    (query) => !(query.cursor && query.before),
    'Send cursor or before, not both',
  ),
  v.check(
    (query) => query.from === undefined || query.sort === 'az',
    'from only works with sort=az',
  ),
);

export type LibraryQuery = v.InferOutput<typeof LibraryQuerySchema>;

const TimeSchema = v.number();

/** The owner's progress in an in-progress show: regular episodes only (no specials) */
export const LibraryProgressSchema = v.object({
  /** Aired regular episodes */
  aired: v.number(),
  /** The current season is out but not complete and its next episode has a date ("1 new · airing") */
  airing: v.boolean(),
  /** The season of the most recently watched regular episode ("Watching S02") */
  lastSeason: v.nullable(v.number()),
  /** The highest regular episode watched ("Stopped at S04E11") */
  lastWatched: v.nullable(EpisodeCodeSchema),
  /** The first aired episode with no mark (watched or skipped) */
  next: v.nullable(EpisodeCodeSchema),
  /** Every regular episode, aired or not */
  total: v.number(),
  /** Aired, not watched, not skipped ("5 to go") */
  toWatch: v.number(),
  /** Distinct regular episodes watched */
  watched: v.number(),
});

export type LibraryProgress = v.InferOutput<typeof LibraryProgressSchema>;

export const LibraryItemFactsSchema = v.object({
  /** At least one regular episode has aired */
  hasAired: v.boolean(),
  /** Regular seasons */
  seasonCount: v.number(),
  /** TMDB status: Returning Series, Ended, Canceled... */
  status: v.string(),
  /** Minutes, an estimate; null when unknown */
  totalRuntime: v.nullable(v.number()),
  /** TMDB type: Scripted, Miniseries... */
  type: v.nullable(v.string()),
});

export type LibraryItemFacts = v.InferOutput<typeof LibraryItemFactsSchema>;

/** Which shelves a show sits on (a show can sit on two) */
export const LibraryOnSchema = v.object({
  favourite: v.boolean(),
  finished: v.boolean(),
  /** Always false for a visitor */
  hidden: v.boolean(),
  /** In progress and not hidden */
  watching: v.boolean(),
  watchlist: v.boolean(),
});

export type LibraryOn = v.InferOutput<typeof LibraryOnSchema>;

export const LibraryItemSchema = v.object({
  /** ms: the shelf's own date, the one its date sorts use (All: the latest of the show's dates) */
  addedAt: TimeSchema,
  /** null when TMDB doesn't know the show (yet) */
  facts: v.nullable(LibraryItemFactsSchema),
  /** ms, or null when not finished */
  finishedAt: v.nullable(TimeSchema),
  /** ms, or null when not hidden; always null for a visitor */
  hiddenAt: v.nullable(TimeSchema),
  id: v.number(),
  on: LibraryOnSchema,
  /** '' when the show has no poster */
  posterImage: v.string(),
  /** In-progress shows on Watching, Hidden and Favourites; null elsewhere */
  progress: v.nullable(LibraryProgressSchema),
  slug: v.string(),
  title: v.string(),
  /**
   * Finished and every regular episode marked "I don't remember" (Get
   * started's "Seen it"): the tile says "Seen, no date". Set on Finished
   * and Favourites; absent elsewhere.
   */
  undated: v.optional(v.boolean()),
});

export type LibraryItem = v.InferOutput<typeof LibraryItemSchema>;

export const LibraryPageSchema = v.object({
  /** How many entries of the ordered result sit above `items[0]` (0 at the top; the "A–O · 131 shows" row) */
  before: v.number(),
  /** The visitor filter counts over the shelf (before `q`); null for the owner */
  filters: v.nullable(v.object({ new: v.number(), shared: v.number() })),
  items: v.array(LibraryItemSchema),
  /** The rail's live letters: initials present in the result (`#` first) */
  letters: v.array(v.picklist(LIBRARY_LETTERS)),
  /** `?cursor=` for the page after; null at the end */
  nextCursor: v.nullable(v.string()),
  /** `?before=` for the page above; null at the top */
  prevCursor: v.nullable(v.string()),
  /** Entries matching the shelf, `with` and `q` */
  total: v.number(),
});

export type LibraryPage = v.InferOutput<typeof LibraryPageSchema>;

export const LibraryCountsSchema = v.object({
  all: v.number(),
  favourites: v.number(),
  finished: v.number(),
  /** null for a visitor */
  hidden: v.nullable(v.number()),
  watching: v.number(),
  watchlist: v.number(),
});

export type LibraryCounts = v.InferOutput<typeof LibraryCountsSchema>;

/** `GET /user/:id/library` */
export const LibrarySummarySchema = v.object({
  counts: LibraryCountsSchema,
});

export type LibrarySummary = v.InferOutput<typeof LibrarySummarySchema>;
