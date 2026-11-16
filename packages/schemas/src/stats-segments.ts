/** Stats segments for the stats page. All dates are UTC unless noted. */

/** One calendar month (UTC) of dated regular episodes: History's month header */
export type StatsMonth = Readonly<{
  episodes: number;
  /** Sum of the episodes' runtimes */
  minutes: number;
}>;

/** `GET /user/:id/stats/years`: the Years submenu and its sparkline counts */
export type StatsYears = Readonly<{
  /** Years with dated watches, newest first */
  years: ReadonlyArray<
    Readonly<{
      year: number;
      /** Every dated episode of the year, specials included */
      episodes: number;
      /**
       * 12 entries, January first, in `timeZone`: dated **regular** episodes only
       * (season 0 never counts), so the months can add up to less than
       * `episodes`. Optional: absent in answers cached before it existed.
       */
      months?: ReadonlyArray<StatsMonth>;
    }>
  >;
  /**
   * Regular episodes marked "I don't remember" (no date; in no year).
   * Optional: absent in answers cached before it existed.
   */
  undated?: number;
  /**
   * The zone the years and months count in: the user's (from their country,
   * as `when`), so a watch is on the same day as in the episode modal.
   * Absent in answers cached before it (UTC).
   */
  timeZone?: string;
}>;

/** One series of "The year in shows" */
export type StatsShowRow = Readonly<{
  id: number;
  title: string;
  slug: string;
  posterImage: string | null;
  episodes: number;
  runtimeMinutes: number;
  /** ms */
  firstWatchedAt: number;
  lastWatchedAt: number;
  /** Episodes per visual week, 53 values (same weeks as `/weekly`) */
  weeks: ReadonlyArray<number>;
}>;

/** `GET /user/:id/stats/:year/shows`: series × ISO week, in the order watched (sort by `runtimeMinutes` for "Most hours") */
export type StatsShows = Readonly<{
  shows: ReadonlyArray<StatsShowRow>;
}>;

export type StatsFinishedShow = Readonly<{
  id: number;
  title: string;
  slug: string;
  posterImage: string | null;
  /** ms: when the show reached Finished */
  finishedAt: number;
  /** Episodes and runtime watched in the year, and the seasons they were in */
  episodes: number;
  runtimeMinutes: number;
  seasons: ReadonlyArray<number>;
}>;

/** `GET /user/:id/stats/:year/finished`: "Finished in 2025", newest first */
export type StatsFinished = Readonly<{
  count: number;
  shows: ReadonlyArray<StatsFinishedShow>;
}>;

/** `GET /user/:id/stats/:year/daily`: "Every day" */
export type StatsDaily = Readonly<{
  /** Days with at least one episode, oldest first (`YYYY-MM-DD`) */
  days: ReadonlyArray<Readonly<{ date: string; episodes: number }>>;
  activeDays: number;
  busiestDay: Readonly<{ date: string; episodes: number }> | null;
  /** A Monday to Sunday week */
  busiestWeek: Readonly<{ from: string; to: string; episodes: number }> | null;
  /** Consecutive days, the longest run (the first on a tie) */
  longestStreak: Readonly<{ days: number; from: string; to: string }> | null;
  /** The zone the days are counted in (the user's; absent in older cached answers: UTC) */
  timeZone?: string;
}>;

export type StatsNightEpisode = Readonly<{
  seriesId: number;
  title: string;
  slug: string;
  seasonNumber: number;
  episodeNumber: number;
}>;

export type StatsNight = Readonly<{
  /** The evening's date (an episode at 01:30 counts to the evening before), user's time zone */
  date: string;
  episodes: number;
  runtimeMinutes: number;
  /** In watched order: derive "S02E07–E12" from these */
  items: ReadonlyArray<StatsNightEpisode>;
}>;

/** `GET /user/:id/stats/:year/when`: "When" and "Biggest night" (bulk marks left out) */
export type StatsWhen = Readonly<{
  /** IANA zone from the user's country (default `Europe/London`) */
  timeZone: string;
  /** Episodes per local hour, 24 values (index 0 = 00:00 to 01:00) */
  hours: ReadonlyArray<number>;
  /** Episodes per local weekday, Monday first, 7 values */
  weekdays: ReadonlyArray<number>;
  /** Episodes counted */
  episodes: number;
  /** Episodes left out: marked watched in bulk (same timestamp as another) */
  bulkExcluded: number;
  /**
   * Episodes watched in the daytime (06:00 to 18:00 local) on weekdays and on
   * weekends. Optional: absent from answers cached before it was added.
   */
  daytime?: Readonly<{ weekday: number; weekend: number }>;
  biggestNight: StatsNight | null;
  /** The next biggest nights ("Also big"), at most 3 */
  otherNights: ReadonlyArray<StatsNight>;
}>;

export type StatsSeriesRef = Readonly<{
  id: number;
  title: string;
  slug: string;
  posterImage: string | null;
}>;

/** `GET /user/:id/stats/:year/new-or-back`: first-ever watch in the year, or a series seen before */
export type StatsNewOrBack = Readonly<{
  /** Most hours first */
  new: ReadonlyArray<StatsSeriesRef>;
  back: ReadonlyArray<StatsSeriesRef>;
}>;
