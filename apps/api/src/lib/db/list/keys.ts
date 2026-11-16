/**
 * The Lists table's key formats, built here for every reader and writer. A
 * user's partition (`USER#<userId>`) holds list items (`LIST#`), per-show
 * prefs (`PREF#`), parked watchlist copies (`PARKED#`) and per-show watch
 * summaries (`AGG#`). Never change a format: stored items keep the one they
 * were written with, and a Query by prefix must not reach another kind.
 */

const DEFAULT_LISTS: ReadonlyArray<string> = [
  'WATCHED',
  'WATCHLIST',
  'FAVORITES',
  'IN_PROGRESS',
  'RESUMING_SOON',
];

/** Any list id but the five default lists (a custom list's ULID) */
export const isCustomList = (listId: string) => !DEFAULT_LISTS.includes(listId);

/** The partition key of a user's items */
export const userPk = (userId: string) => `USER#${userId}`;

/** Sort-key prefix of every list item (prefs, parked copies and summaries sit outside it) */
export const LIST_PREFIX = 'LIST#';

/** Sort-key prefix of every per-show prefs record */
export const PREF_PREFIX = 'PREF#';

/** Sort-key prefix of a per-show prefs record, before the show's id */
export const PREF_SERIES_PREFIX = `${PREF_PREFIX}SERIES#`;

/** Sort-key prefix of the per-show watch summaries and their meta row */
export const ROLLUP_PREFIX = 'AGG#';

/** Sort-key prefix of one show's watch summary, before the show's id */
export const ROLLUP_SHOW_PREFIX = `${ROLLUP_PREFIX}SHOW#`;

/** Sort key of the row that says every show has a summary */
export const ROLLUP_META_SK = `${ROLLUP_PREFIX}META`;

/** Sort-key prefix of one default list's items: `begins_with` for that list */
export const listItemPrefix = (listId: string) =>
  `${LIST_PREFIX}${listId}#ITEM#`;

/** A list item's sort key; a custom list's items sit under `LIST#CUSTOM#` */
export const listItemSk = (listId: string, id: number) =>
  isCustomList(listId)
    ? `${LIST_PREFIX}CUSTOM#${listId}#ITEM#${id}`
    : `${listItemPrefix(listId)}${id}`;

/** A default list item's sort key, parsed: its list and show id */
const LIST_ITEM_SK = /^LIST#([A-Z_]+)#ITEM#(\d+)$/;

export const parseListItemSk = (
  sk: string,
): Readonly<{ listId: string; id: number }> | null => {
  const match = LIST_ITEM_SK.exec(sk);
  return match ? { id: Number(match[2]), listId: match[1]! } : null;
};

/** The partition key of one user's list on gsi1, gsi2 and gsi3 */
export const listIndexPk = (userId: string, listId: string) =>
  `${LIST_PREFIX}${userId}#${listId}`;

/** The partition key on gsi4: every user's items for one show */
export const seriesIndexPk = (seriesId: number) => `SERIES#${seriesId}`;

/** A per-show prefs record's sort key */
export const prefSk = (seriesId: number) => `${PREF_SERIES_PREFIX}${seriesId}`;

const PREF_SK = /^PREF#SERIES#(\d+)$/;

/** A prefs record's sort key, parsed: the show's id, or null */
export const parsePrefSk = (sk: string): number | null => {
  const match = PREF_SK.exec(sk);
  return match ? Number(match[1]) : null;
};

/** A parked watchlist copy's sort key (outside `LIST#` and `PREF#`) */
export const parkedWatchlistSk = (id: number) => `PARKED#WATCHLIST#${id}`;
