import * as v from 'valibot';

import { WatchedAtSchema } from './watched';

/**
 * Inputs of the web's marking server actions (`apps/web/src/lib/marking`).
 * Every action validates its arguments with these before it calls the API.
 */

const positiveId = v.pipe(v.number(), v.integer(), v.minValue(1));
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

/** Mark (or re-date) episodes, each with its own date. */
export const MarkEpisodesInputSchema = v.object({
  episodes: episodeList(
    v.object({ ...EpisodeRefSchema.entries, when: MarkWhenSchema }),
  ),
  seriesId: positiveId,
});

export type MarkEpisodesInput = v.InferInput<typeof MarkEpisodesInputSchema>;

export const UnmarkEpisodesInputSchema = v.object({
  episodes: episodeList(EpisodeRefSchema),
  seriesId: positiveId,
});

export type UnmarkEpisodesInput = v.InferInput<
  typeof UnmarkEpisodesInputSchema
>;

/** Mark every not-yet-watched aired episode of a season (or of the show). */
export const MarkScopeInputSchema = v.object({
  seasonNumber: v.optional(count(999)),
  seriesId: positiveId,
  when: v.variant('kind', [
    v.object({ kind: v.literal('now') }),
    v.object({ kind: v.literal('date'), watchedAt: WatchedAtSchema }),
    v.object({ kind: v.literal('unknown') }),
  ]),
});

export type MarkScopeInput = v.InferInput<typeof MarkScopeInputSchema>;

export const UnmarkScopeInputSchema = v.object({
  seasonNumber: v.optional(count(999)),
  seriesId: positiveId,
});

export type UnmarkScopeInput = v.InferInput<typeof UnmarkScopeInputSchema>;

export const SetInListInputSchema = v.object({
  list: v.picklist(['favorites', 'watchlist']),
  seriesId: positiveId,
  value: v.boolean(),
});

export type SetInListInput = v.InferInput<typeof SetInListInputSchema>;

export const SeriesIdInputSchema = v.object({ seriesId: positiveId });

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
        id: positiveId,
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
