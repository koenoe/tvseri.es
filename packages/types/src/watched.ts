import * as v from 'valibot';
import { WatchProviderSchema } from './watch-provider';

export const WatchedItemSchema = v.object({
  episodeNumber: v.number(),
  posterImage: v.optional(v.string()), // deprecated
  posterPath: v.string(),
  runtime: v.number(),
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

export type CreateWatchedItem = v.InferOutput<typeof CreateWatchedItemSchema>;
