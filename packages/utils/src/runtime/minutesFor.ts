/**
 * Episode runtimes by season number, index = episode number − 1, 0 where
 * TMDB has none (`GET /series/:id/runtimes`, `SeriesRuntimes`).
 */
export type RuntimesBySeason = Readonly<Record<number, ReadonlyArray<number>>>;

/** An episode by its numbers */
export type EpisodeNumbers = Readonly<{ season: number; episode: number }>;

const seasonMean = (minutes: ReadonlyArray<number> | undefined) => {
  const known = (minutes ?? []).filter((value) => value > 0);
  return known.length > 0
    ? Math.round(known.reduce((sum, value) => sum + value, 0) / known.length)
    : null;
};

/**
 * The minutes one episode takes, by the one rule every "time left" uses
 * (Home's In progress, the profile, the Library, the show page): its own
 * runtime; else the mean of its season's known runtimes (the show page's
 * fallback); else the series' average; null when none is known. A runtime
 * of 0 is "unknown", never a length: nothing is invented.
 */
export function episodeMinutes(
  runtimes: RuntimesBySeason | undefined,
  { episode, season }: EpisodeNumbers,
  seriesAverage: number | null,
): number | null {
  const minutes = runtimes?.[season];
  const own = minutes?.[episode - 1] ?? 0;
  if (own > 0) {
    return own;
  }
  const fallback = seasonMean(minutes) ?? seriesAverage;
  return fallback !== null && fallback > 0 ? fallback : null;
}

/**
 * The minutes these episodes take together: the sum of their real runtimes
 * (`episodeMinutes`), never one runtime × the count. 0 for no episodes; null
 * when any of them is unknown (say nothing rather than a wrong total).
 */
export function minutesFor(
  episodes: ReadonlyArray<EpisodeNumbers>,
  runtimes: RuntimesBySeason | undefined,
  seriesAverage: number | null,
): number | null {
  let total = 0;
  for (const episode of episodes) {
    const minutes = episodeMinutes(runtimes, episode, seriesAverage);
    if (minutes === null) {
      return null;
    }
    total += minutes;
  }
  return total;
}

/**
 * Episodes 1 to `count` of a season with every gap filled by the same rule,
 * 0 where nothing is known: what a client needs to sum the time left again
 * after a mark without the series' runtimes.
 */
export function resolveSeasonMinutes(
  runtimes: RuntimesBySeason | undefined,
  season: number,
  count: number,
  seriesAverage: number | null,
): number[] {
  return Array.from(
    { length: Math.max(count, 0) },
    (_, index) =>
      episodeMinutes(runtimes, { episode: index + 1, season }, seriesAverage) ??
      0,
  );
}
