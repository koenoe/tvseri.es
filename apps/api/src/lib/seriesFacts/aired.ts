import type { SeriesFacts } from '@tvseri.es/schemas';
import { endOfDayUtc, isOver } from '@tvseri.es/utils';

type Episode = Readonly<{ seasonNumber: number; episodeNumber: number }>;

/**
 * The one rule for how many regular episodes of a show have aired, per
 * season (the watched stream and the nightly job finish a show by it, the
 * overview and the library count by it):
 *
 * - from TMDB's last aired episode: every season before its season, and its
 *   number in its own season; in the next episode's season, the episodes
 *   before it, and the next episode itself once it has aired (`nextHasAired`:
 *   the caller's day rule);
 * - never fewer than the seasons prove: a season that started (air date in
 *   the past) counts in full when a later season has started too, or when
 *   the show has ended or was cancelled.
 *
 * The floor matters when `last_episode_to_air` is a special (season 0, so
 * no regular season counted at all), missing, or stuck in an early season:
 * an undercount there finishes a show the user is only part way through.
 * A season without an air date never counts by the floor.
 */
export const airedBySeason = (
  input: Readonly<{
    seasons: ReadonlyArray<
      Readonly<{ seasonNumber: number; episodeCount: number; airDate: string }>
    >;
    last: Episode | null;
    next: Episode | null;
    nextHasAired: boolean;
    status: string;
    now: number;
  }>,
): Record<number, number> => {
  const { last, next, now } = input;
  const started = input.seasons
    .filter((season) => {
      const airedAt = Date.parse(season.airDate);
      return !Number.isNaN(airedAt) && airedAt <= now;
    })
    .map((season) => season.seasonNumber);
  const latestStarted = started.length > 0 ? Math.max(...started) : 0;
  const over = isOver(input.status);

  const bySeason: Record<number, number> = {};
  for (const season of input.seasons) {
    let aired = 0;
    if (last && season.seasonNumber < last.seasonNumber) {
      aired = season.episodeCount;
    } else if (last && season.seasonNumber === last.seasonNumber) {
      aired = last.episodeNumber;
    }
    if (next?.seasonNumber === season.seasonNumber) {
      // Its season's episodes before the next one have aired, whatever the
      // last aired episode says (a special there counts none)
      aired = Math.max(
        aired,
        input.nextHasAired ? next.episodeNumber : next.episodeNumber - 1,
      );
    }
    const isProvenAired =
      started.includes(season.seasonNumber) &&
      (over || season.seasonNumber < latestStarted);
    if (isProvenAired) {
      aired = season.episodeCount;
    }
    bySeason[season.seasonNumber] = Math.min(aired, season.episodeCount);
  }
  return bySeason;
};

/**
 * How many regular episodes have aired at `now`, per season and in total
 * (`airedBySeason`), from the cached facts: the next episode counts once its
 * air date has ended (TMDB updates `last_episode_to_air` with a delay; the
 * facts are cached for a day).
 */
export const airedEpisodesAt = (
  facts: Pick<
    SeriesFacts,
    'lastEpisodeToAir' | 'nextEpisodeToAir' | 'seasons' | 'status'
  >,
  now: number,
) => {
  const next = facts.nextEpisodeToAir;
  const bySeason = airedBySeason({
    last: facts.lastEpisodeToAir,
    next,
    nextHasAired: Boolean(next?.airDate && endOfDayUtc(next.airDate) <= now),
    now,
    seasons: facts.seasons,
    status: facts.status,
  });
  const total = Object.values(bySeason).reduce((sum, count) => sum + count, 0);
  return { bySeason, total };
};
