import * as v from 'valibot';
import { TvSeriesSchema } from './tv-series';
import { TvSeriesForWatchedSchema, WatchedAtSchema } from './watched';

// export type List = Readonly<{
//   id: string;
//   title: string;
//   description?: string;
//   createdAt: number;
// }>;

export const ListItemSchema = v.object({
  createdAt: v.optional(v.number()),
  id: TvSeriesSchema.entries.id,
  position: v.optional(v.number()),
  posterImage: TvSeriesSchema.entries.posterImage,
  posterPath: TvSeriesSchema.entries.posterPath,
  slug: TvSeriesSchema.entries.slug,
  status: TvSeriesSchema.entries.status,
  title: TvSeriesSchema.entries.title,
});

export type ListItem = v.InferOutput<typeof ListItemSchema>;

/**
 * What a client adds to Favorites or the watchlist: a positive integer id,
 * the bounded strings of a watched item (the lowercased title is a sort key:
 * at most 1,024 bytes) and, when given, a time in the watched window.
 */
export const CreateListItemSchema = v.object({
  createdAt: v.optional(WatchedAtSchema),
  id: TvSeriesForWatchedSchema.entries.id,
  position: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  posterPath: TvSeriesForWatchedSchema.entries.posterPath,
  slug: TvSeriesForWatchedSchema.entries.slug,
  status: TvSeriesSchema.entries.status,
  title: v.pipe(TvSeriesForWatchedSchema.entries.title, v.maxBytes(1000)),
});

export type CreateListItem = v.InferOutput<typeof CreateListItemSchema>;

export const DeleteListItemSchema = v.object({
  id: v.number(),
});

export type DeleteListItem = v.InferOutput<typeof DeleteListItemSchema>;
