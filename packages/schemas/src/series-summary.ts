/**
 * A show's numbers for meta lines on lists of shows (`GET /series/summaries`),
 * from the shared series facts: what a discover result lacks (network,
 * seasons, length).
 */
export type SeriesSummary = Readonly<{
  id: number;
  /** In TMDB's order; the first is the one a meta line shows */
  networks: ReadonlyArray<Readonly<{ id: number; name: string }>>;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  /** TMDB status: Returning Series, Ended, Canceled... */
  status: string;
  /**
   * Nothing is left to air (`isOver`): Ended or Canceled with no next
   * episode. Absent from older answers.
   */
  over?: boolean;
  /** Typical episode length × episodes; null when TMDB has no runtime */
  totalMinutes: number | null;
  /** First air year, null when unknown */
  year: number | null;
  /** The year of TMDB's last air date ("finished in 2019"), null when unknown */
  lastAirYear: number | null;
  genreIds: ReadonlyArray<number>;
}>;

/** `GET /series/summaries?ids=1,2,3`: one entry per asked id, null when TMDB has none */
export type SeriesSummaries = Readonly<Record<string, SeriesSummary | null>>;

/**
 * `GET /series/romanized-titles?ids=1,2,3`: the Latin-script title by
 * show id; null when the original title is Latin already or none is known.
 */
export type RomanizedTitles = Readonly<Record<string, string | null>>;
