import * as v from 'valibot';

// Shared by the current and the previous year
export const StatsMetricsSchema = v.object({
  avgPerDay: v.number(),
  episodeCount: v.number(),
  longestStreak: v.number(),
  seriesCount: v.number(),
  totalRuntime: v.number(),
});

export type StatsMetrics = Readonly<v.InferOutput<typeof StatsMetricsSchema>>;

export const StatsSummarySchema = v.object({
  current: StatsMetricsSchema,
  previous: StatsMetricsSchema,
});

export type StatsSummary = Readonly<v.InferOutput<typeof StatsSummarySchema>>;

export const StatsFavoritesCountSchema = v.object({
  current: v.number(),
  previous: v.number(),
});

export type StatsFavoritesCount = Readonly<
  v.InferOutput<typeof StatsFavoritesCountSchema>
>;

const StatsSpotlightEpisodeSchema = v.object({
  episodeNumber: v.number(),
  runtime: v.number(),
  seasonNumber: v.number(),
  stillImage: v.nullable(v.string()),
  title: v.string(),
});

const StatsSpotlightTvSeriesSchema = v.object({
  backdropColor: v.nullable(v.string()),
  backdropImage: v.nullable(v.string()),
  id: v.number(),
  posterImage: v.nullable(v.string()),
  slug: v.string(),
  title: v.string(),
  titleTreatmentImage: v.nullable(v.string()),
});

// The first or the last watch
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

export const StatsSpotlightSchema = v.object({
  first: StatsSpotlightItemSchema,
  last: StatsSpotlightItemSchema,
});

export type StatsSpotlight = Readonly<
  v.InferOutput<typeof StatsSpotlightSchema>
>;

export const StatsWeeklyItemSchema = v.object({
  episodes: v.number(),
  runtimeHours: v.number(),
  totalRuntime: v.number(),
  week: v.number(),
});

export type StatsWeeklyItem = Readonly<
  v.InferOutput<typeof StatsWeeklyItemSchema>
>;

export const StatsGenreItemSchema = v.object({
  count: v.number(),
  genre: v.string(),
});

export type StatsGenreItem = Readonly<
  v.InferOutput<typeof StatsGenreItemSchema>
>;

export const StatsProviderItemSchema = v.object({
  count: v.number(),
  defaultColor: v.string(),
  logo: v.nullable(v.string()),
  name: v.string(),
  /**
   * The provider's top series by episodes (at most 3), for "Billions, Barry,
   * The Pitt and 30 more". Optional: absent from answers cached before it.
   */
  series: v.optional(v.array(v.object({ id: v.number(), title: v.string() }))),
});

export type StatsProviderItem = Readonly<
  v.InferOutput<typeof StatsProviderItemSchema>
>;

// Country name → count
export const StatsCountriesSchema = v.record(v.string(), v.number());

export type StatsCountries = Readonly<
  v.InferOutput<typeof StatsCountriesSchema>
>;

export const StatsWatchedSeriesItemSchema = v.object({
  id: v.number(),
  posterImage: v.nullable(v.string()),
  slug: v.string(),
  title: v.string(),
});

export type StatsWatchedSeriesItem = Readonly<
  v.InferOutput<typeof StatsWatchedSeriesItemSchema>
>;
