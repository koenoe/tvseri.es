import * as v from 'valibot';
import { PositiveIdSchema } from './positive-id';
import { WatchProviderSchema } from './watch-provider';

/** ISO 3166-1 alpha-2, e.g. `GB` */
const RegionSchema = v.pipe(v.string(), v.regex(/^[A-Z]{2}$/));

const boundedString = (max: number) => v.pipe(v.string(), v.maxLength(max));
const count = (max: number) =>
  v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(max));

// Minimal TV series schema for watched operations - only includes fields actually used
export const TvSeriesForWatchedSchema = v.object({
  id: PositiveIdSchema,
  posterPath: boundedString(200),
  slug: boundedString(500),
  title: boundedString(1000),
});

export type TvSeriesForWatched = v.InferOutput<typeof TvSeriesForWatchedSchema>;

// Minimal episode schema for watched operations - only includes fields actually used
export const EpisodeForWatchedSchema = v.object({
  airDate: boundedString(40),
  episodeNumber: count(9999),
  // Minutes; the longest TV specials run a few hours
  runtime: count(1440),
  seasonNumber: count(999),
  stillPath: v.nullable(boundedString(200)),
  title: boundedString(1000),
});

export type EpisodeForWatched = v.InferOutput<typeof EpisodeForWatchedSchema>;

/** Earliest plausible watch date: 2000-01-01 */
const MIN_WATCHED_AT = Date.UTC(2000, 0, 1);
/** Some slack for clock skew between the client and the API */
const MAX_WATCHED_AT_AHEAD_MS = 24 * 60 * 60 * 1000;

/**
 * When an episode was watched (epoch ms): from 2000-01-01 up to a day from
 * now. Future dates would land in the stats of a year that hasn't happened.
 */
export const WatchedAtSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(MIN_WATCHED_AT, 'watchedAt is before 2000'),
  v.check(
    (value) => value <= Date.now() + MAX_WATCHED_AT_AHEAD_MS,
    'watchedAt is in the future',
  ),
);

/**
 * "I don't remember": the episode is watched, the date isn't known. Only ever
 * `true` (absent otherwise). `watchedAt` then holds when it was marked.
 */
export const DateUnknownSchema = v.literal(true);

export const WatchedItemSchema = v.object({
  dateUnknown: v.optional(DateUnknownSchema),
  episodeAirDate: v.optional(v.string()),
  episodeNumber: v.number(),
  episodeStillImage: v.optional(v.nullable(v.string())),
  episodeStillPath: v.optional(v.nullable(v.string())),
  episodeTitle: v.optional(v.string()),
  /** Written by an import; Undo deletes only items that still carry it */
  importId: v.optional(v.string()),
  posterImage: v.optional(v.string()), // deprecated
  posterPath: v.string(),
  runtime: v.fallback(v.number(), 0),
  seasonNumber: v.number(),
  seriesId: v.number(),
  slug: v.string(),
  title: v.string(),
  userId: v.string(),
  watchedAt: v.number(),
  watchProviderLogoImage: v.optional(v.nullable(v.string())),
  watchProviderLogoPath: v.optional(v.nullable(v.string())),
  watchProviderName: v.optional(v.nullable(v.string())),
});

export type WatchedItem = Readonly<v.InferOutput<typeof WatchedItemSchema>>;

/**
 * Body of the mark-watched routes (episode, season, show). Without
 * `watchedAt` or `dateUnknown` the mark is "Just now".
 */
export const CreateWatchedItemSchema = v.intersect([
  v.pipe(
    v.object({
      dateUnknown: v.optional(DateUnknownSchema),
      region: v.optional(RegionSchema),
      watchedAt: v.optional(WatchedAtSchema),
      watchProvider: v.optional(v.nullable(WatchProviderSchema)),
    }),
    v.check(
      (input) => !(input.dateUnknown && input.watchedAt !== undefined),
      'Use watchedAt or dateUnknown, not both',
    ),
  ),
  v.union([
    v.object({
      watchProvider: WatchProviderSchema,
    }),
    v.object({
      watchProvider: v.null(),
    }),
    v.object({
      region: RegionSchema,
    }),
  ]),
]);

/**
 * One watched episode as a batch sends it (the watched batch and imports,
 * where the web's matcher resolved the title to a show)
 */
export const WatchedEpisodeEntrySchema = v.object({
  dateUnknown: v.optional(DateUnknownSchema),
  episode: EpisodeForWatchedSchema,
  tvSeries: TvSeriesForWatchedSchema,
  // With dateUnknown, the time it was marked
  watchedAt: WatchedAtSchema,
  watchProvider: v.optional(v.nullable(WatchProviderSchema)),
});

/**
 * An import's id as a request names it: the API mints a UUID per import
 * (`POST /me/imports`), so anything else is refused before it is looked up.
 */
export const ImportIdSchema = v.pipe(v.string(), v.uuid());

export const CreateWatchedItemBatchSchema = v.pipe(
  v.array(
    v.object({
      ...WatchedEpisodeEntrySchema.entries,
      // Undo of an unmark puts an imported episode back in its import; the
      // API keeps it only for the caller's open last import
      importId: v.optional(ImportIdSchema),
      userId: boundedString(64),
    }),
  ),
  v.minLength(1, 'Batch cannot be empty.'),
  v.maxLength(50, 'Batch size too large. Maximum 50 items per request.'),
);

export const DeleteWatchedItemBatchSchema = v.pipe(
  v.array(
    v.object({
      episodeNumber: count(9999),
      seasonNumber: count(999),
      tvSeries: TvSeriesForWatchedSchema,
      userId: boundedString(64),
    }),
  ),
  v.minLength(1, 'Batch cannot be empty.'),
  v.maxLength(50, 'Batch size too large. Maximum 50 items per request.'),
);

export type CreateWatchedItem = v.InferOutput<typeof CreateWatchedItemSchema>;
export type CreateWatchedItemBatch = v.InferOutput<
  typeof CreateWatchedItemBatchSchema
>;
export type DeleteWatchedItemBatch = v.InferOutput<
  typeof DeleteWatchedItemBatchSchema
>;

/** One watched episode in `GET /me/export/everything.json` */
export type ExportedWatchedItem = Readonly<{
  /** ISO timestamp; null for "I don't remember" */
  watchedAt: string | null;
  /** When it was marked (epoch ms), also set for an undated one */
  markedAt: number;
  episodeNumber: number;
  episodeTitle: string | null;
  runtime: number;
  seasonNumber: number;
  seriesId: number;
  title: string;
  watchProvider: string | null;
}>;
