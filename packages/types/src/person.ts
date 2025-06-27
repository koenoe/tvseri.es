import * as v from 'valibot';

export const PersonSchema = v.object({
  age: v.optional(v.number()),
  biography: v.optional(v.string()),
  birthdate: v.optional(v.string()),
  character: v.string(),
  deathdate: v.optional(v.string()),
  id: v.number(),
  image: v.string(),
  imdbId: v.optional(v.string()),
  isAdult: v.optional(v.boolean()),
  job: v.string(),
  knownForDepartment: v.optional(v.string()),
  name: v.string(),
  numberOfEpisodes: v.number(),
  placeOfBirth: v.optional(v.string()),
  slug: v.string(),
});

export type Person = v.InferOutput<typeof PersonSchema>;
