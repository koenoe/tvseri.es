import * as v from 'valibot';
import { GenreSchema } from './genre';
import { PersonSchema } from './person';

export const EpisodeSchema = v.object({
  airDate: v.string(),
  description: v.string(),
  episodeNumber: v.number(),
  hasAired: v.fallback(v.boolean(), false),
  id: v.number(),
  runtime: v.number(),
  seasonNumber: v.number(),
  stillImage: v.string(),
  title: v.string(),
});

export type Episode = v.InferOutput<typeof EpisodeSchema>;

export const SeasonSchema = v.object({
  airDate: v.string(),
  description: v.string(),
  episodes: v.array(EpisodeSchema),
  hasAired: v.fallback(v.boolean(), false),
  id: v.number(),
  numberOfAiredEpisodes: v.optional(v.number()),
  numberOfEpisodes: v.optional(v.number()),
  seasonNumber: v.number(),
  title: v.string(),
});

export type Season = v.InferOutput<typeof SeasonSchema>;

export const StatusSchema = v.picklist([
  'Returning Series',
  'Planned',
  'In Production',
  'Ended',
  'Canceled',
  'Pilot',
]);

const LanguageSchema = v.object({
  code: v.string(),
  englishName: v.string(),
  name: v.string(),
});

const CountrySchema = v.object({
  code: v.string(),
  name: v.string(),
});

const NetworkSchema = v.object({
  id: v.number(),
  logo: v.string(),
  name: v.string(),
});

export type Status = v.InferOutput<typeof StatusSchema>;

export const TvSeriesSchema = v.object({
  backdropColor: v.string(),
  backdropImage: v.optional(v.string()),
  backdropPath: v.optional(v.string()),
  countries: v.array(CountrySchema),
  createdBy: v.array(PersonSchema),
  description: v.string(),
  firstAirDate: v.string(),
  genres: v.array(GenreSchema),
  hasAired: v.fallback(v.boolean(), false),
  id: v.number(),
  isAdult: v.fallback(v.boolean(), false),
  languages: v.array(LanguageSchema),
  lastAirDate: v.string(),
  lastEpisodeToAir: v.optional(v.nullable(EpisodeSchema)),
  network: v.optional(NetworkSchema),
  nextEpisodeToAir: v.optional(v.nullable(EpisodeSchema)),
  numberOfAiredEpisodes: v.fallback(v.number(), 0),
  numberOfEpisodes: v.fallback(v.number(), 0),
  numberOfSeasons: v.fallback(v.number(), 0),
  originalLanguage: v.string(),
  originalTitle: v.string(),
  originCountry: v.optional(CountrySchema),
  popularity: v.fallback(v.number(), 0),
  posterImage: v.string(),
  posterPath: v.string(),
  releaseYear: v.string(),
  seasons: v.optional(v.array(SeasonSchema)),
  slug: v.string(),
  status: StatusSchema,
  tagline: v.string(),
  title: v.string(),
  titleTreatmentImage: v.optional(v.string()),
  type: v.string(),
  voteAverage: v.fallback(v.number(), 0),
  voteCount: v.fallback(v.number(), 0),
  website: v.optional(v.string()),
});

export type TvSeries = v.InferOutput<typeof TvSeriesSchema>;
