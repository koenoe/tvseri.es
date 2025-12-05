import * as v from 'valibot';

// Base stats metrics - shared between current and previous year
export const StatsMetricsSchema = v.object({
  avgPerDay: v.number(),
  episodeCount: v.number(),
  longestStreak: v.number(),
  seriesCount: v.number(),
  totalRuntime: v.number(),
});

export type StatsMetrics = Readonly<v.InferOutput<typeof StatsMetricsSchema>>;

// Summary endpoint response
export const StatsSummarySchema = v.object({
  current: StatsMetricsSchema,
  previous: StatsMetricsSchema,
});

export type StatsSummary = Readonly<v.InferOutput<typeof StatsSummarySchema>>;

// Favorites count endpoint response
export const StatsFavoritesCountSchema = v.object({
  current: v.number(),
  previous: v.number(),
});

export type StatsFavoritesCount = Readonly<
  v.InferOutput<typeof StatsFavoritesCountSchema>
>;

// Spotlight episode info
export const StatsSpotlightEpisodeSchema = v.object({
  episodeNumber: v.number(),
  runtime: v.number(),
  seasonNumber: v.number(),
  stillImage: v.nullable(v.string()),
  title: v.string(),
});

export type StatsSpotlightEpisode = Readonly<
  v.InferOutput<typeof StatsSpotlightEpisodeSchema>
>;

// Spotlight TV series info
export const StatsSpotlightTvSeriesSchema = v.object({
  backdropImage: v.nullable(v.string()),
  id: v.number(),
  posterImage: v.nullable(v.string()),
  slug: v.string(),
  title: v.string(),
  titleTreatmentImage: v.nullable(v.string()),
});

export type StatsSpotlightTvSeries = Readonly<
  v.InferOutput<typeof StatsSpotlightTvSeriesSchema>
>;

// Single spotlight item (first or last watch)
export const StatsSpotlightItemSchema = v.nullable(
  v.object({
    episode: StatsSpotlightEpisodeSchema,
    tvSeries: StatsSpotlightTvSeriesSchema,
    watchedAt: v.number(),
    watchProviderLogo: v.nullable(v.string()),
  }),
);

export type StatsSpotlightItem = Readonly<
  v.InferOutput<typeof StatsSpotlightItemSchema>
>;

// Spotlight endpoint response
export const StatsSpotlightSchema = v.object({
  first: StatsSpotlightItemSchema,
  last: StatsSpotlightItemSchema,
});

export type StatsSpotlight = Readonly<
  v.InferOutput<typeof StatsSpotlightSchema>
>;

// Weekly stats item
export const StatsWeeklyItemSchema = v.object({
  episodes: v.number(),
  runtimeHours: v.number(),
  totalRuntime: v.number(),
  week: v.number(),
});

export type StatsWeeklyItem = Readonly<
  v.InferOutput<typeof StatsWeeklyItemSchema>
>;

// Genre stats item
export const StatsGenreItemSchema = v.object({
  count: v.number(),
  genre: v.string(),
});

export type StatsGenreItem = Readonly<
  v.InferOutput<typeof StatsGenreItemSchema>
>;

// Provider/streaming service stats item
export const StatsProviderItemSchema = v.object({
  count: v.number(),
  defaultColor: v.string(),
  logo: v.nullable(v.string()),
  name: v.string(),
});

export type StatsProviderItem = Readonly<
  v.InferOutput<typeof StatsProviderItemSchema>
>;

// Countries stats - record of country name to count
export const StatsCountriesSchema = v.record(v.string(), v.number());

export type StatsCountries = Readonly<
  v.InferOutput<typeof StatsCountriesSchema>
>;

// Watched series item
export const StatsWatchedSeriesItemSchema = v.object({
  id: v.number(),
  posterImage: v.nullable(v.string()),
  slug: v.string(),
  title: v.string(),
});

export type StatsWatchedSeriesItem = Readonly<
  v.InferOutput<typeof StatsWatchedSeriesItemSchema>
>;
