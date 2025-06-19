import * as v from 'valibot';

export const PersonSchema = v.object({
  biography: v.optional(v.string()),
  birthdate: v.optional(v.string()),
  character: v.string(),
  deathdate: v.optional(v.string()),
  numberOfEpisodes: v.number(),
  id: v.number(),
  image: v.string(),
  imdbId: v.optional(v.string()),
  isAdult: v.optional(v.boolean()),
  job: v.string(),
  knownForDepartment: v.optional(v.string()),
  name: v.string(),
  placeOfBirth: v.optional(v.string()),
  slug: v.string(),
  age: v.optional(v.number()),
});

export type Person = v.InferOutput<typeof PersonSchema>;
