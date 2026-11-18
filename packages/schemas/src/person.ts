import * as v from 'valibot';

export const PersonSchema = v.object({
  age: v.optional(v.number()),
  biography: v.optional(v.string()),
  birthdate: v.optional(v.string()),
  character: v.string(),
  deathdate: v.optional(v.string()),
  gender: v.optional(v.picklist(['female', 'male', 'non-binary'])),
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

const CrewJobSchema = v.object({
  episodes: v.number(),
  job: v.string(),
});

/**
 * A show's crew member in one TMDB department (`aggregate_credits`): every
 * job with its episode count, so the sheet can group them like IMDb's full
 * credits. TMDB lists someone once per department they worked in.
 */
const CrewCreditSchema = v.object({
  department: v.string(),
  id: v.number(),
  image: v.string(),
  jobs: v.array(CrewJobSchema),
  name: v.string(),
  numberOfEpisodes: v.number(),
  slug: v.string(),
});

export type CrewCredit = v.InferOutput<typeof CrewCreditSchema>;
