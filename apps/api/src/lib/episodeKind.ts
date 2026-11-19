import { firstEpisodeOf } from '@tvseri.es/utils';

/** What a coming episode is to its season */
export type EpisodeKind = 'episode' | 'season-finale' | 'season-premiere';

type CountedSeason = Readonly<{
  seasonNumber: number;
  episodeCount: number;
  firstEpisodeNumber?: number;
}>;

type EpisodeAt = Readonly<{ episodeNumber: number; seasonNumber: number }>;

/**
 * A season's first and last episode numbers. Most seasons run 1…count, but
 * TMDB numbers some shows on across seasons (Naruto Shippuden S2 = E33…E53).
 * A season TMDB doesn't list runs from 1 and has no last episode (0).
 */
export const seasonBounds = (
  seasons: ReadonlyArray<CountedSeason>,
  seasonNumber: number,
) => {
  const season = seasons.find(
    (candidate) => candidate.seasonNumber === seasonNumber,
  );
  const first = season ? firstEpisodeOf(season) : 1;
  const count = season?.episodeCount ?? 0;
  return { count, first, last: count > 0 ? first + count - 1 : 0 };
};

/**
 * A season's first episode is its premiere, its last (of more than one) its
 * finale; anything between is an episode. The season's size is TMDB's count.
 */
export const episodeKindOf = (
  next: EpisodeAt,
  seasons: ReadonlyArray<CountedSeason>,
): EpisodeKind => {
  const { count, first, last } = seasonBounds(seasons, next.seasonNumber);
  if (next.episodeNumber === first) {
    return 'season-premiere';
  }
  return count > 1 && next.episodeNumber === last ? 'season-finale' : 'episode';
};
