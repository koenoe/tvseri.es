/** An episode as the series facts keep it */
export type SeriesFactsEpisode = Readonly<{
  /** YYYY-MM-DD */
  airDate: string;
  episodeNumber: number;
  runtime: number | null;
  seasonNumber: number;
}>;

/**
 * The facts about a show that the profile overview, premieres, Waiting for,
 * the season ledger and the duration rows need, from one TMDB details call,
 * shared by every user (Cache table, 24 h). Aired counts are derived at read
 * time from `lastEpisodeToAir` / `nextEpisodeToAir` (`airedEpisodesAt`), so
 * they don't go stale while cached. Specials (season 0) are left out.
 */
export type SeriesFacts = Readonly<{
  id: number;
  title: string;
  slug: string;
  posterPath: string | null;
  backdropPath: string | null;
  /** TMDB status: Returning Series, Ended, Canceled, In Production, Planned... */
  status: string;
  /** TMDB type: Scripted, Miniseries, Documentary, Reality... */
  type: string | null;
  /** YYYY-MM-DD, '' when unknown */
  firstAirDate: string;
  lastAirDate: string;
  genreIds: ReadonlyArray<number>;
  networks: ReadonlyArray<Readonly<{ id: number; name: string }>>;
  originCountries: ReadonlyArray<string>;
  originalLanguage: string;
  imdbId: string | null;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  /** Regular seasons only. `firstEpisodeNumber` absent means 1 (TvSeries.seasons) */
  seasons: ReadonlyArray<
    Readonly<{
      seasonNumber: number;
      episodeCount: number;
      airDate: string;
      firstEpisodeNumber?: number;
    }>
  >;
  /** All regular episodes, aired or not */
  numberOfEpisodes: number;
  lastEpisodeToAir: SeriesFactsEpisode | null;
  nextEpisodeToAir: SeriesFactsEpisode | null;
  /** Typical episode length in minutes, null when unknown */
  episodeRuntime: number | null;
  /** Estimate: episodeRuntime × numberOfEpisodes, null when unknown */
  totalRuntime: number | null;
}>;
