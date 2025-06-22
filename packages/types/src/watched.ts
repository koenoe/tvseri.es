import * as v from 'valibot';
import { WatchProviderSchema } from './watch-provider';
import { TvSeriesSchema, SeasonSchema } from './tv-series';

// Minimal TV series schema for watched operations - only includes fields actually used
export const TvSeriesForWatchedSchema = v.object({
  id: v.number(),
  posterPath: v.string(),
  slug: v.string(),
  title: v.string(),
  seasons: v.optional(v.array(SeasonSchema)), // Only needed for markTvSeriesWatched
});

export type TvSeriesForWatched = v.InferOutput<typeof TvSeriesForWatchedSchema>;

export const WatchedItemSchema = v.object({
  episodeNumber: v.number(),
  posterImage: v.optional(v.string()), // deprecated
  posterPath: v.string(),
  runtime: v.fallback(v.number(), 0),
  seasonNumber: v.number(),
  seriesId: v.number(),
  slug: v.string(),
  title: v.string(),
  userId: v.string(),
  watchProviderLogoPath: v.optional(v.nullable(v.string())),
  watchProviderLogoImage: v.optional(v.nullable(v.string())),
  watchProviderName: v.optional(v.nullable(v.string())),
  watchedAt: v.number(),
});

export type WatchedItem = Readonly<v.InferOutput<typeof WatchedItemSchema>>;

export const CreateWatchedItemSchema = v.intersect([
  v.object({
    watchProvider: v.optional(WatchProviderSchema),
    region: v.optional(v.string()),
  }),
  v.union([
    v.object({
      watchProvider: WatchProviderSchema,
    }),
    v.object({
      region: v.string(),
    }),
  ]),
]);

export const CreateWatchedItemBatchSchema = v.pipe(
  v.array(
    v.object({
      ...v.pick(WatchedItemSchema, [
        'episodeNumber',
        'runtime',
        'seasonNumber',
        'userId',
        'watchedAt',
      ]).entries,
      tvSeries: TvSeriesForWatchedSchema,
      watchProvider: v.optional(v.nullable(WatchProviderSchema)),
    }),
  ),
  v.minLength(1, 'Batch cannot be empty.'),
  v.maxLength(50, 'Batch size too large. Maximum 50 items per request.'),
);

export const DeleteWatchedItemBatchSchema = v.pipe(
  v.array(
    v.object({
      userId: v.string(),
      tvSeries: TvSeriesForWatchedSchema,
      seasonNumber: v.number(),
      episodeNumber: v.number(),
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
