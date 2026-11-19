import * as v from 'valibot';
import { GenreSchema } from './genre';
import { PersonSchema } from './person';

export const EpisodeSchema = v.object({
  airDate: v.string(),
  description: v.string(),
  episodeNumber: v.number(),
  /**
   * TMDB's episode type when it marks a break: `finale` (a season's or the
   * show's last) or `mid-season` (the last before a mid-season break);
   * absent for a standard episode
   */
  episodeType: v.optional(v.picklist(['finale', 'mid-season'])),
  hasAired: v.fallback(v.boolean(), false),
  id: v.number(),
  runtime: v.number(),
  seasonNumber: v.number(),
  stillImage: v.string(),
  stillPath: v.string(),
  title: v.string(),
});

export type Episode = v.InferOutput<typeof EpisodeSchema>;

export const SeasonSchema = v.object({
  airDate: v.string(),
  description: v.string(),
  episodes: v.array(EpisodeSchema),
  /**
   * The season's first episode number; absent means 1. TMDB numbers some
   * shows on across seasons (Naruto Shippuden S2 = E33…E53).
   */
  firstEpisodeNumber: v.optional(v.number()),
  hasAired: v.fallback(v.boolean(), false),
  id: v.number(),
  numberOfAiredEpisodes: v.optional(v.number()),
  numberOfEpisodes: v.optional(v.number()),
  seasonNumber: v.number(),
  title: v.string(),
});

export type Season = v.InferOutput<typeof SeasonSchema>;

/**
 * `GET /series/:id/runtimes`: every regular season's episode runtimes in
 * minutes (0 when unknown), by season number; index = episode number − 1.
 */
export type SeriesRuntimes = Readonly<Record<number, ReadonlyArray<number>>>;

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
  /**
   * The show's own details only: whether the logo reads as a white
   * silhouette. False (a filled block): the web draws it in its own colours
   * on a light chip. Absent when unchecked: drawn white, as for true
   */
  logoSilhouette: v.optional(v.boolean()),
  name: v.string(),
});

export type Status = v.InferOutput<typeof StatusSchema>;

/** Ids on other sites, for the links in the show's Information block */
const ExternalIdsSchema = v.object({
  imdbId: v.nullable(v.string()),
});

export const TvSeriesSchema = v.object({
  backdropColor: v.string(),
  backdropImage: v.optional(v.string()),
  backdropPath: v.optional(v.string()),
  countries: v.array(CountrySchema),
  createdBy: v.array(PersonSchema),
  /**
   * `/collection/trending` only: a creator's best-known other show (most
   * TMDB votes, more than this show's); null when none qualifies
   */
  creatorOf: v.optional(v.nullable(v.object({ title: v.string() }))),
  description: v.string(),
  externalIds: v.optional(ExternalIdsSchema),
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
  /** Regular seasons only (season 1 up): every count above sums these */
  seasons: v.optional(v.array(SeasonSchema)),
  slug: v.string(),
  /**
   * Specials (season 0, "Specials") beside the seasons, never in them, so no
   * sum over `seasons` moves; absent when the show has none. Its aired count
   * is an estimate (TMDB's show details have no per-special dates): all of
   * them once the first special aired, those before the next one to air when
   * that is a special. The season route has each special's own date.
   */
  specials: v.optional(SeasonSchema),
  status: StatusSchema,
  tagline: v.string(),
  title: v.string(),
  /**
   * The title treatment's width over its height (TMDB's `aspect_ratio`), so
   * its box can be reserved before it loads; absent when unknown
   */
  titleTreatmentAspectRatio: v.optional(v.number()),
  titleTreatmentImage: v.optional(v.string()),
  /** `/collection/trending` only: the top-billed cast's names (at most 3) */
  topCast: v.optional(v.array(v.string())),
  type: v.string(),
  voteAverage: v.fallback(v.number(), 0),
  voteCount: v.fallback(v.number(), 0),
  website: v.optional(v.string()),
});

export type TvSeries = v.InferOutput<typeof TvSeriesSchema>;

/** A guest star or crew member of one episode, for linking to /person/:id */
export type EpisodePerson = Readonly<{
  /** The role played (guest stars); empty for crew */
  character: string;
  id: number;
  image: string;
  /** The crew job (Director, Writer...); empty for guest stars */
  job: string;
  name: string;
}>;

/** `?view=credits` on the episode route */
export type EpisodeCredits = Readonly<{
  crew: ReadonlyArray<EpisodePerson>;
  guestStars: ReadonlyArray<EpisodePerson>;
}>;

export type EpisodeWithCredits = Episode &
  Readonly<{ credits: EpisodeCredits }>;

/** `GET /series/:id/season/:s/ratings`: IMDb ratings by episode number */
export type SeasonRatings = Readonly<{
  ratings: Readonly<Record<string, Readonly<{ imdbRating: number | null }>>>;
}>;
