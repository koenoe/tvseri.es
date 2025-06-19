import * as v from 'valibot';
import { TvSeriesSchema, type TvSeries } from './tv-series';

// export type List = Readonly<{
//   id: string;
//   title: string;
//   description?: string;
//   createdAt: number;
// }>;

export const ListItemSchema = v.object({
  id: TvSeriesSchema.entries.id,
  posterImage: TvSeriesSchema.entries.posterImage,
  posterPath: TvSeriesSchema.entries.posterPath,
  title: TvSeriesSchema.entries.title,
  slug: TvSeriesSchema.entries.slug,
  status: TvSeriesSchema.entries.status,
  position: v.optional(v.number()),
  createdAt: v.optional(v.number()),
});

export type ListItem = v.InferOutput<typeof ListItemSchema>;

export const CreateListItemSchema = v.intersect([
  v.omit(ListItemSchema, ['createdAt', 'posterImage']),
  v.object({
    createdAt: v.optional(v.number()),
  }),
]);

export type CreateListItem = v.InferOutput<typeof CreateListItemSchema>;

export const DeleteListItemSchema = v.object({
  id: v.number(),
});

export type DeleteListItem = v.InferOutput<typeof DeleteListItemSchema>;
