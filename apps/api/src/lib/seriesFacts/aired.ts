import type { SeriesFacts } from '@tvseri.es/schemas';
import {
  firstEpisodeOf,
  hasAiredAt,
  isOver,
  type SeasonsOutlook,
  type ShowProgress,
  seasonsOutlook,
  showProgress,
} from '@tvseri.es/utils';

type Episode = Readonly<{ seasonNumber: number; episodeNumber: number }>;

/**
 * The one rule for how many regular episodes of a show have aired, per
 * season (the watched stream and the nightly job finish a show by it, the
 * overview and the library count by it):
 *
 * - from TMDB's last aired episode: every season before its season, and its
 *   place in its own season (its number from the season's first, which
 *   isn't 1 where TMDB numbers on across seasons); in the next episode's
 *   season, the episodes before it, and the next episode itself once it has aired (`nextHasAired`:
 *   the caller's day rule);
 * - never fewer than the seasons prove: a season that started (air date in
 *   the past) counts in full when a later season has started too, or when
 *   the show has ended or was cancelled; never the next episode's season,
 *   which TMDB's next episode to air proves unfinished.
 *
 * The floor matters when `last_episode_to_air` is a special (season 0, so
 * no regular season counted at all), missing, or stuck in an early season:
 * an undercount there finishes a show the user is only part way through.
 * A season without an air date never counts by the floor.
 */
export const airedBySeason = (
  input: Readonly<{
    seasons: ReadonlyArray<
      Readonly<{
        seasonNumber: number;
        episodeCount: number;
        airDate: string;
        firstEpisodeNumber?: number;
      }>
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
    .filter((season) => hasAiredAt(season.airDate, now))
    .map((season) => season.seasonNumber);
  const latestStarted = started.length > 0 ? Math.max(...started) : 0;
  const over = isOver({ nextEpisodeToAir: next, status: input.status });

  const bySeason: Record<number, number> = {};
  for (const season of input.seasons) {
    // How many of the season's episodes run up to this one, inclusive
    const placeOf = (episode: Episode) =>
      episode.episodeNumber - firstEpisodeOf(season) + 1;
    let aired = 0;
    if (last && season.seasonNumber < last.seasonNumber) {
      aired = season.episodeCount;
    } else if (last && season.seasonNumber === last.seasonNumber) {
      aired = placeOf(last);
    }
    if (next?.seasonNumber === season.seasonNumber) {
      // Its season's episodes before the next one have aired, whatever the
      // last aired episode says (a special there counts none)
      aired = Math.max(
        aired,
        input.nextHasAired ? placeOf(next) : placeOf(next) - 1,
      );
    }
    // A next episode to air in this season proves it isn't done, even when
    // TMDB already calls the show Ended or Canceled
    const isProvenAired =
      started.includes(season.seasonNumber) &&
      next?.seasonNumber !== season.seasonNumber &&
      (over || season.seasonNumber < latestStarted);
    if (isProvenAired) {
      aired = season.episodeCount;
    }
    bySeason[season.seasonNumber] = Math.max(
      0,
      Math.min(aired, season.episodeCount),
    );
  }
  return bySeason;
};

/**
 * How many regular episodes have aired at `now`, per season and in total
 * (`airedBySeason`), from the cached facts: the next episode counts from the
 * start of its air day (`hasAiredAt`, the one air-day rule; TMDB updates
 * `last_episode_to_air` with a delay and the facts are cached for a day).
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
    nextHasAired: hasAiredAt(next?.airDate, now),
    now,
    seasons: facts.seasons,
    status: facts.status,
  });
  const total = Object.values(bySeason).reduce((sum, count) => sum + count, 0);
  return { bySeason, total };
};

/**
 * The viewer's progress in a show at `now` (`showProgress`, the shared rule),
 * from the facts' aired counts (`airedEpisodesAt`) and their watched and
 * skipped episode codes.
 */
export const progressAt = (
  facts: Parameters<typeof airedEpisodesAt>[0],
  marks: Readonly<{
    watched: ReadonlyArray<string>;
    skipped: ReadonlyArray<string>;
  }>,
  now: number,
): ShowProgress => {
  const { bySeason } = airedEpisodesAt(facts, now);
  return showProgress({
    seasons: facts.seasons.map((season) => ({
      airedCount: bySeason[season.seasonNumber] ?? 0,
      firstEpisodeNumber: season.firstEpisodeNumber,
      seasonNumber: season.seasonNumber,
    })),
    skipped: marks.skipped,
    watched: marks.watched,
  });
};

/**
 * Aired seasons and a listed renewal (`seasonsOutlook`) at `now`. A season
 * also counts as started once its air date has passed: the aired rule's floor
 * leaves the latest season at 0 when TMDB's last aired episode is a special.
 */
export const seasonsOutlookAt = (
  facts: Parameters<typeof airedEpisodesAt>[0],
  now: number,
): SeasonsOutlook => {
  const { bySeason } = airedEpisodesAt(facts, now);
  return seasonsOutlook(
    facts.status,
    facts.seasons.map((season) => ({
      seasonNumber: season.seasonNumber,
      started:
        (bySeason[season.seasonNumber] ?? 0) > 0 ||
        hasAiredAt(season.airDate, now),
    })),
  );
};
