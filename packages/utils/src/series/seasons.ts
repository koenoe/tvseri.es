/** A regular season and whether it has started airing */
type ListedSeason = Readonly<{ seasonNumber: number; started: boolean }>;

/** What a show's seasons say beside its status: "1 season · S02 renewed" */
export type SeasonsOutlook = Readonly<{
  /** Seasons that have started airing; the listed count while none has */
  airedSeasons: number;
  /** The listed season after the last one to air, for a returning show; null otherwise */
  renewedSeason: number | null;
}>;

/** The lowest listed season above `after`, or null when none is listed */
export const firstSeasonAfter = (
  seasonNumbers: ReadonlyArray<number>,
  after: number,
): number | null => {
  const later = seasonNumbers.filter((seasonNumber) => seasonNumber > after);
  return later.length > 0 ? Math.min(...later) : null;
};

/**
 * TMDB's "Returning Series" only means not ended, and its season count
 * includes a season it lists before it airs. So a renewal is only claimed
 * when TMDB lists the season after the last one to air, and only aired
 * seasons are counted, so the row never reads "2 seasons · S02 renewed".
 * Before anything has aired the listed seasons are all there is to count.
 */
export const seasonsOutlook = (
  status: string,
  seasons: ReadonlyArray<ListedSeason>,
): SeasonsOutlook => {
  const aired = seasons
    .filter((season) => season.started)
    .map((season) => season.seasonNumber);
  if (aired.length === 0) {
    return { airedSeasons: seasons.length, renewedSeason: null };
  }
  return {
    airedSeasons: aired.length,
    renewedSeason:
      status === 'Returning Series'
        ? firstSeasonAfter(
            seasons.map((season) => season.seasonNumber),
            Math.max(...aired),
          )
        : null,
  };
};
