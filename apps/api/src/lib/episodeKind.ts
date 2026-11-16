import type { SeriesFacts } from '@tvseri.es/schemas';

/** What a coming episode is to its season */
export type EpisodeKind = 'episode' | 'season-finale' | 'season-premiere';

/**
 * A season's first episode is its premiere, its last (of more than one) its
 * finale; anything between is an episode. The season's size is TMDB's count.
 */
export const episodeKindOf = (
  next: Readonly<{ episodeNumber: number; seasonNumber: number }>,
  seasons: SeriesFacts['seasons'],
): EpisodeKind => {
  if (next.episodeNumber === 1) {
    return 'season-premiere';
  }
  const total =
    seasons.find((season) => season.seasonNumber === next.seasonNumber)
      ?.episodeCount ?? 0;
  return total > 1 && next.episodeNumber === total
    ? 'season-finale'
    : 'episode';
};
