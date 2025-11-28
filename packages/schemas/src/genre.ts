import * as v from 'valibot';

export const GenreSchema = v.object({
  id: v.number(),
  name: v.string(),
  slug: v.string(),
});

export type Genre = v.InferOutput<typeof GenreSchema>;
