import * as v from 'valibot';

import { PositiveIdSchema } from './positive-id';
import { DateUnknownSchema, ImportIdSchema, WatchedAtSchema } from './watched';

/**
 * Inputs of the web's marking server actions (`apps/web/src/lib/marking`).
 * Every action validates its arguments with these before it calls the API.
 */

const count = (max: number) =>
  v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(max));

/** Most episodes one action takes (a long daily show's season fits). */
export const MAX_EPISODES_PER_MARK_ACTION = 2000;

export const EpisodeRefSchema = v.object({
  episodeNumber: count(9999),
  seasonNumber: count(999),
});

export type EpisodeRef = Readonly<v.InferOutput<typeof EpisodeRefSchema>>;

/**
 * When an episode was watched:
 * - `now`: Just now (the default everywhere)
 * - `date`: a picked moment (epoch ms)
 * - `unknown`: I don't remember (`dateUnknown`)
 * - `release`: local noon of the episode's air date; `tzOffsetMinutes` is the
 *   browser's `Date#getTimezoneOffset()` (UTC minus local, in minutes)
 */
export const MarkWhenSchema = v.variant('kind', [
  v.object({ kind: v.literal('now') }),
  v.object({ kind: v.literal('date'), watchedAt: WatchedAtSchema }),
  v.object({ kind: v.literal('unknown') }),
  v.object({
    kind: v.literal('release'),
    tzOffsetMinutes: v.pipe(
      v.number(),
      v.integer(),
      v.minValue(-840),
      v.maxValue(840),
    ),
  }),
]);

export type MarkWhen = v.InferOutput<typeof MarkWhenSchema>;

const episodeList = <T extends v.GenericSchema>(item: T) =>
  v.pipe(
    v.array(item),
    v.minLength(1),
    v.maxLength(MAX_EPISODES_PER_MARK_ACTION),
  );

/**
 * Undo of an unmark: the record exactly as it was. `source` names where it
 * was watched; the server keeps it only when it is a service it knows.
 */
export const RestoreWhenSchema = v.object({
  dateUnknown: v.optional(DateUnknownSchema),
  importId: v.optional(ImportIdSchema),
  kind: v.literal('restore'),
  /** The record's minutes: an episode TMDB no longer lists is put back with them */
  runtime: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1440)),
  ),
  source: v.optional(v.pipe(v.string(), v.maxLength(100))),
  watchedAt: WatchedAtSchema,
});

export type RestoreWhen = v.InferOutput<typeof RestoreWhenSchema>;

/** Mark (or re-date) episodes, each with its own date, or restore them. */
export const MarkEpisodesInputSchema = v.object({
  episodes: episodeList(
    v.object({
      ...EpisodeRefSchema.entries,
      when: v.variant('kind', [MarkWhenSchema, RestoreWhenSchema]),
    }),
  ),
  seriesId: PositiveIdSchema,
});

export const UnmarkEpisodesInputSchema = v.object({
  episodes: episodeList(EpisodeRefSchema),
  seriesId: PositiveIdSchema,
});

/** Mark every not-yet-watched aired episode of a season (or of the show). */
export const MarkScopeInputSchema = v.object({
  seasonNumber: v.optional(count(999)),
  seriesId: PositiveIdSchema,
  when: v.variant('kind', [
    v.object({ kind: v.literal('now') }),
    v.object({ kind: v.literal('date'), watchedAt: WatchedAtSchema }),
    v.object({ kind: v.literal('unknown') }),
  ]),
});

export const UnmarkScopeInputSchema = v.object({
  seasonNumber: v.optional(count(999)),
  seriesId: PositiveIdSchema,
});

export const SetInListInputSchema = v.object({
  list: v.picklist(['favorites', 'watchlist']),
  seriesId: PositiveIdSchema,
  value: v.boolean(),
});

export const SeriesIdInputSchema = v.object({ seriesId: PositiveIdSchema });

/** The Library's bulk actions: lists and prefs, never watched */
export const BULK_LIBRARY_OPS = [
  'favourites-add',
  'favourites-remove',
  'hide',
  'unhide',
  'watchlist-add',
  'watchlist-remove',
] as const;

export type BulkLibraryOp = (typeof BULK_LIBRARY_OPS)[number];

/** The most shows one bulk action takes */
export const BULK_LIBRARY_MAX = 50;

export const BulkLibraryInputSchema = v.object({
  /** Each show, with its original added date for a re-add (Undo) */
  items: v.pipe(
    v.array(
      v.object({
        addedAt: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
        id: PositiveIdSchema,
      }),
    ),
    v.minLength(1),
    v.maxLength(BULK_LIBRARY_MAX),
  ),
  op: v.picklist(BULK_LIBRARY_OPS),
});

export type BulkLibraryInput = v.InferInput<typeof BulkLibraryInputSchema>;

/** Which shows a bulk action did, and which failed */
export type BulkLibraryResult = Readonly<{
  done: ReadonlyArray<number>;
  failed: ReadonlyArray<number>;
}>;
