import * as v from 'valibot';
import { WatchProviderSchema } from './watch-provider';

// Minimal TV series schema for watched operations - only includes fields actually used
export const TvSeriesForWatchedSchema = v.object({
  id: v.number(),
  posterPath: v.string(),
  slug: v.string(),
  title: v.string(),
});

export type TvSeriesForWatched = v.InferOutput<typeof TvSeriesForWatchedSchema>;

// Minimal episode schema for watched operations - only includes fields actually used
export const EpisodeForWatchedSchema = v.object({
  airDate: v.string(),
  episodeNumber: v.number(),
  runtime: v.number(),
  seasonNumber: v.number(),
  stillPath: v.nullable(v.string()),
  title: v.string(),
});

export type EpisodeForWatched = v.InferOutput<typeof EpisodeForWatchedSchema>;

export const WatchedItemSchema = v.object({
  episodeAirDate: v.optional(v.string()),
  episodeNumber: v.number(),
  episodeStillImage: v.optional(v.nullable(v.string())),
  episodeStillPath: v.optional(v.nullable(v.string())),
  episodeTitle: v.optional(v.string()),
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

export const CreateWatchedItemSchema = v.intersect([
  v.object({
    region: v.optional(v.string()),
    watchProvider: v.optional(v.nullable(WatchProviderSchema)),
  }),
  v.union([
    v.object({
      watchProvider: WatchProviderSchema,
    }),
    v.object({
      watchProvider: v.null(),
    }),
    v.object({
      region: v.string(),
    }),
  ]),
]);

export const CreateWatchedItemBatchSchema = v.pipe(
  v.array(
    v.object({
      episode: EpisodeForWatchedSchema,
      tvSeries: TvSeriesForWatchedSchema,
      userId: v.string(),
      watchedAt: v.number(),
      watchProvider: v.optional(v.nullable(WatchProviderSchema)),
    }),
  ),
  v.minLength(1, 'Batch cannot be empty.'),
  v.maxLength(50, 'Batch size too large. Maximum 50 items per request.'),
);

export const DeleteWatchedItemBatchSchema = v.pipe(
  v.array(
    v.object({
      episodeNumber: v.number(),
      seasonNumber: v.number(),
      tvSeries: TvSeriesForWatchedSchema,
      userId: v.string(),
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
