import * as v from 'valibot';
import { GenreSchema, type Genre } from './genre';
import { PersonSchema, type Person } from './person';

export const EpisodeSchema = v.object({
  description: v.string(),
  episodeNumber: v.number(),
  id: v.number(),
  airDate: v.string(),
  seasonNumber: v.number(),
  title: v.string(),
  runtime: v.number(),
  stillImage: v.string(),
  hasAired: v.fallback(v.boolean(), false),
});

export type Episode = v.InferOutput<typeof EpisodeSchema>;

export const SeasonSchema = v.object({
  description: v.string(),
  id: v.number(),
  airDate: v.string(),
  seasonNumber: v.number(),
  title: v.string(),
  episodes: v.array(EpisodeSchema),
  numberOfEpisodes: v.optional(v.number()),
  numberOfAiredEpisodes: v.optional(v.number()),
  hasAired: v.fallback(v.boolean(), false),
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
  englishName: v.string(),
  name: v.string(),
  code: v.string(),
});

const CountrySchema = v.object({
  name: v.string(),
  code: v.string(),
});

const NetworkSchema = v.object({
  name: v.string(),
  id: v.number(),
  logo: v.string(),
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
  id: v.number(),
  isAdult: v.fallback(v.boolean(), false),
  hasAired: v.fallback(v.boolean(), false),
  languages: v.array(LanguageSchema),
  lastAirDate: v.string(),
  lastEpisodeToAir: v.optional(v.nullable(EpisodeSchema)),
  nextEpisodeToAir: v.optional(v.nullable(EpisodeSchema)),
  network: v.optional(NetworkSchema),
  numberOfEpisodes: v.fallback(v.number(), 0),
  numberOfAiredEpisodes: v.fallback(v.number(), 0),
  numberOfSeasons: v.fallback(v.number(), 0),
  originCountry: v.optional(CountrySchema),
  originalLanguage: v.string(),
  originalTitle: v.string(),
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
