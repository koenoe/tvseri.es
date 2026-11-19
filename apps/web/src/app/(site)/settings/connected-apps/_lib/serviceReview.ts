import {
  type ConnectionUnresolved,
  UnresolvedKeySchema,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

import type { ActionError } from '@/lib/actions/result';
import type { ImportProblem } from '@/lib/import/contract';

import type { ProblemItem } from '../../_components/problems/problems';

/**
 * A service's review list's shapes, shared by the card and its actions:
 * what a fix sends (the entries as the list holds them, plus the viewer's
 * pick) and what comes back. Isomorphic: no server imports.
 */

/** One fix or Skip covers a summed-up group: a few API calls' worth */
const REVIEW_KEYS_PER_ACTION = 500;

const CellSchema = v.union([v.pipe(v.string(), v.maxLength(1000)), v.number()]);
const IdSchema = v.pipe(v.number(), v.integer(), v.minValue(1));
const NumberInSeasonSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

/**
 * An entry as the list sent it back. Re-sent rather than read again: the API
 * lists the review entries only by page, and it closes only keys that are
 * the viewer's own, so a doctored row can at most mark an episode the
 * viewer could mark by hand.
 */
const ReviewEntrySchema = v.object({
  key: UnresolvedKeySchema,
  row: v.object({
    episode: CellSchema,
    season: CellSchema,
    title: v.pipe(v.string(), v.maxLength(1000)),
  }),
  watchedAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
});
export type ReviewEntry = v.InferOutput<typeof ReviewEntrySchema>;

const ReviewPickSchema = v.variant('kind', [
  v.object({ kind: v.literal('series'), seriesId: IdSchema }),
  v.object({
    episodeNumber: NumberInSeasonSchema,
    kind: v.literal('episode'),
    seasonNumber: NumberInSeasonSchema,
    seriesId: IdSchema,
  }),
]);
export type ReviewPick = v.InferOutput<typeof ReviewPickSchema>;

export const ResolveInputSchema = v.object({
  entries: v.pipe(
    v.array(ReviewEntrySchema),
    v.minLength(1),
    v.maxLength(REVIEW_KEYS_PER_ACTION),
  ),
  pick: ReviewPickSchema,
});

export const DismissInputSchema = v.object({
  keys: v.pipe(
    v.array(UnresolvedKeySchema),
    v.minLength(1),
    v.maxLength(REVIEW_KEYS_PER_ACTION),
  ),
});

/** The next page's cursor (the API's last key); null reads the first page again */
export const CursorSchema = v.nullable(UnresolvedKeySchema);

/**
 * What a Skip left the list with: the keys closed for good, and why it
 * stopped when a call failed part-way (the earlier calls' keys stay closed)
 */
export type DismissOutcome = Readonly<{
  closed: ReadonlyArray<string>;
  failed: ActionError | null;
}>;

/** A resolve's answer: what left the list, and what is still open (re-asked) */
export type ResolveOutcome = DismissOutcome &
  Readonly<{
    /** Entries the pick didn't settle, with the matcher's new question */
    open: ReadonlyArray<ConnectionUnresolved>;
    written: number;
  }>;

/**
 * The entries as the importer's problems, so its grouping and review items
 * draw them: `index` is the entry's place in `entries` (which only grows,
 * so an item's indexes stay valid while others close).
 */
export const reviewProblems = (
  entries: ReadonlyArray<ConnectionUnresolved>,
  closed: ReadonlySet<string>,
): ReadonlyArray<ImportProblem> =>
  entries.flatMap((entry, index) =>
    closed.has(entry.key)
      ? []
      : [
          {
            candidates: entry.candidates,
            episodes: entry.episodes,
            index,
            kind: entry.kind,
            row: {
              episode: String(entry.row.episode),
              season: String(entry.row.season),
              title: entry.row.title,
            },
            series: entry.series,
          },
        ],
  );

/** The entries behind one review item */
export const entriesOf = (
  item: ProblemItem,
  entries: ReadonlyArray<ConnectionUnresolved>,
): ReadonlyArray<ConnectionUnresolved> =>
  item.indexes.flatMap((index) => {
    const entry = entries[index];
    return entry ? [entry] : [];
  });

/** What a fix sends: only what the action reads */
export const toReviewEntry = ({
  key,
  row,
  watchedAt,
}: ConnectionUnresolved): ReviewEntry => ({ key, row, watchedAt });

/**
 * Entries a later read brought that the list doesn't hold yet, appended (so
 * the loaded items' indexes stay put); the same list when none are new.
 */
export function withNewEntries(
  loaded: ReadonlyArray<ConnectionUnresolved>,
  read: ReadonlyArray<ConnectionUnresolved>,
): ReadonlyArray<ConnectionUnresolved> {
  const known = new Set(loaded.map(({ key }) => key));
  const added = read.filter(({ key }) => !known.has(key));
  return added.length > 0 ? [...loaded, ...added] : loaded;
}

/**
 * Where focus goes once an item leaves the list: the next item, else the
 * one before it, else nowhere (the list's own heading takes it).
 */
export function focusTargetAfter(
  order: ReadonlyArray<string>,
  key: string,
): string | null {
  const at = order.indexOf(key);
  if (at === -1) {
    return null;
  }
  return order[at + 1] ?? order[at - 1] ?? null;
}
