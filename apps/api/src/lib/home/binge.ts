import type { BingeShow, TvSeries } from '@tvseri.es/schemas';

/** How many shows the Binge calculator (and Did you know's deck) offers */
const CHOICES = 4;

/**
 * Aired episodes per regular season, in season order. Seasons with nothing
 * aired yet are dropped, so the plan only counts what can be watched tonight.
 */
export const episodesPerSeason = (series: TvSeries): number[] =>
  (series.seasons ?? [])
    .filter((season) => season.seasonNumber > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber)
    .map(
      (season) => season.numberOfAiredEpisodes ?? season.numberOfEpisodes ?? 0,
    )
    .filter((count) => count > 0);

/** One choice in the calculator; undefined when nothing has aired */
export const bingeShowOf = (
  series: TvSeries,
  episodeRuntime: number,
): BingeShow | undefined => {
  const seasons = episodesPerSeason(series);
  const numberOfEpisodes = seasons.reduce((sum, count) => sum + count, 0);
  if (numberOfEpisodes === 0) {
    return undefined;
  }
  return {
    episodeRuntime,
    numberOfEpisodes,
    seasons,
    series,
    totalMinutes: numberOfEpisodes * episodeRuntime,
  };
};

/** The day's pick first, then the next shows in the pool, wrapping around */
export const choicesFrom = <T>(pool: ReadonlyArray<T>, start: number): T[] =>
  Array.from(
    { length: Math.min(CHOICES, pool.length) },
    (_, i) => pool[(start + i) % pool.length]!,
  );
