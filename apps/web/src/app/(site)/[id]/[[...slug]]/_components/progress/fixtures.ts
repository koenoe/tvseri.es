import type { SeriesRuntimes } from '@tvseri.es/schemas';
import { type EpisodeCode, episodeCode } from '@tvseri.es/schemas';

import type { SeasonInfo, SeriesMarks, WatchRecord } from '@/lib/marking/types';

/**
 * Test shows for the progress line. Naruto Shippuden: 500 episodes TMDB
 * numbers on across 20 seasons (S2 = E33…, S18 = E372…, S20 = E414…E500),
 * 312 watched and the 68 filler episodes skipped in five runs before 197
 * (the board's runs), 381 onwards still to watch, 23 minutes an episode.
 */

const RECORD: WatchRecord = { runtime: 23, watchedAt: 1 };

const NARUTO_COUNTS = [
  32, 21, 18, 17, 24, 31, 8, 24, 21, 25, 21, 33, 20, 25, 21, 20, 10, 22, 20, 87,
];

const narutoSeasons: ReadonlyArray<SeasonInfo> = NARUTO_COUNTS.map(
  (count, index) => {
    const first =
      1 + NARUTO_COUNTS.slice(0, index).reduce((sum, n) => sum + n, 0);
    return {
      airedEpisodeCount: count,
      episodeCount: count,
      seasonNumber: index + 1,
      ...(first === 1 ? {} : { firstEpisodeNumber: first }),
    };
  },
);

/** Naruto's code of an absolute episode number (numbered on across seasons) */
const narutoCode = (episodeNumber: number): EpisodeCode => {
  const season = narutoSeasons.find(
    (item) =>
      episodeNumber >= (item.firstEpisodeNumber ?? 1) &&
      episodeNumber < (item.firstEpisodeNumber ?? 1) + item.episodeCount,
  );
  return episodeCode({
    episodeNumber,
    seasonNumber: season?.seasonNumber ?? 0,
  });
};

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

const SKIPPED_RANGES: ReadonlyArray<readonly [number, number]> = [
  [57, 71],
  [91, 112],
  [144, 151],
  [170, 171],
  [176, 196],
];

const narutoSkipped = SKIPPED_RANGES.flatMap(([from, to]) => range(from, to));

export const NARUTO: SeriesMarks = {
  seasons: narutoSeasons,
  skipped: narutoSkipped.map(narutoCode).sort(),
  watched: Object.fromEntries(
    range(1, 380)
      .filter((n) => !narutoSkipped.includes(n))
      .map((n) => [narutoCode(n), RECORD]),
  ),
};

/** 23 minutes an episode, by season (index = episode number − 1) */
export const NARUTO_RUNTIMES: SeriesRuntimes = Object.fromEntries(
  narutoSeasons.map((season) => [
    season.seasonNumber,
    Array.from(
      {
        length: (season.firstEpisodeNumber ?? 1) + season.episodeCount - 1,
      },
      () => 23,
    ),
  ]),
);

/** One season of `total` episodes, `aired` out; `marks` gives each aired episode's mark */
export function oneSeason(
  counts: Readonly<{ aired: number; total: number }>,
  marks: string,
): SeriesMarks {
  const code = (episodeNumber: number) =>
    episodeCode({ episodeNumber, seasonNumber: 1 });
  const at = (mark: string) =>
    [...marks].flatMap((item, index) => (item === mark ? [index + 1] : []));
  return {
    seasons: [
      {
        airedEpisodeCount: counts.aired,
        episodeCount: counts.total,
        seasonNumber: 1,
      },
    ],
    skipped: at('s').map(code),
    watched: Object.fromEntries(at('w').map((n) => [code(n), RECORD])),
  };
}

/** 30 minutes an episode, season 1 */
export const ONE_SEASON_RUNTIMES: SeriesRuntimes = {
  1: Array.from({ length: 30 }, () => 30),
};
