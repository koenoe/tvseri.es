import type {
  DurationBucket,
  DurationShow,
  SeriesFacts,
  TmdbDiscoverTvSeriesQuery,
  WhereToStartPick,
} from '@tvseri.es/schemas';
import {
  buildBackdropImageUrl,
  buildPosterImageUrl,
  formatRuntime,
} from '@tvseri.es/utils';

const HOUR = 60;

export const isEnded = (facts: SeriesFacts) =>
  facts.status === 'Ended' || facts.status === 'Canceled';

type Bucket = Readonly<{
  /** Where the candidates come from (TMDB discover) */
  query: TmdbDiscoverTvSeriesQuery;
  /** Whether a show belongs in the tile, judged by its facts */
  includes: (facts: SeriesFacts) => boolean;
  /**
   * Only shows that first aired in the last so many years: where most
   * candidates fit a tile about young shows, so its list fills from the
   * first pages instead of one show per page
   */
  recentYears?: number;
}>;

const total = (facts: SeriesFacts) => facts.totalRuntime;

// 2 Miniseries, 4 Scripted
const SCRIPTED = '2|4';

export const BUCKETS: Readonly<Record<DurationBucket, Bucket>> = {
  'complete-stories': {
    includes: isEnded,
    query: {
      sort_by: 'popularity.desc',
      'vote_count.gte': 100,
      with_status: '3',
    },
  },
  'long-haul': {
    includes: (facts) => facts.seasons.length >= 5,
    query: {
      sort_by: 'popularity.desc',
      'vote_count.gte': 500,
      with_type: '4',
    },
  },
  'one-season': {
    includes: (facts) =>
      facts.seasons.length === 1 &&
      facts.numberOfEpisodes >= 6 &&
      facts.numberOfEpisodes <= 13,
    query: {
      sort_by: 'popularity.desc',
      'vote_count.gte': 100,
      with_type: SCRIPTED,
    },
    // a popular show with one season is nearly always a young one
    recentYears: 3,
  },
  // Miniseries, as "Under 6 hours" is: nearly every ended show of 6 to 10
  // hours is one, and among all scripted shows a page held one at best. From
  // 6 hours up, so the two tiles never list the same shows.
  'one-weekend': {
    includes: (facts) => {
      const minutes = total(facts);
      return (
        isEnded(facts) &&
        minutes !== null &&
        minutes > 6 * HOUR &&
        minutes <= 10 * HOUR
      );
    },
    query: {
      sort_by: 'popularity.desc',
      'vote_count.gte': 50,
      with_type: '2',
    },
  },
  'under-6-hours': {
    includes: (facts) =>
      isEnded(facts) && total(facts) !== null && total(facts)! <= 6 * HOUR,
    query: {
      sort_by: 'popularity.desc',
      'vote_count.gte': 20,
      with_type: '2',
    },
  },
};

/** A tile's discover query on a day (`YYYY-MM-DD`) */
export const bucketQuery = (
  bucket: DurationBucket,
  today: string,
): TmdbDiscoverTvSeriesQuery => {
  const { query, recentYears } = BUCKETS[bucket];
  if (!recentYears) {
    return query;
  }
  const year = Number(today.slice(0, 4)) - recentYears;
  return { ...query, 'first_air_date.gte': `${year}${today.slice(4)}` };
};

export const toDurationShow = (facts: SeriesFacts): DurationShow => ({
  backdropImage: facts.backdropPath
    ? buildBackdropImageUrl(facts.backdropPath)
    : '',
  id: facts.id,
  network: facts.networks[0] ?? null,
  numberOfEpisodes: facts.numberOfEpisodes,
  numberOfSeasons: facts.seasons.length,
  posterImage: facts.posterPath ? buildPosterImageUrl(facts.posterPath) : '',
  slug: facts.slug,
  title: facts.title,
  totalMinutes: facts.totalRuntime,
  year: facts.firstAirDate ? Number(facts.firstAirDate.slice(0, 4)) : null,
});

/** What a Where to start block is about, as its lines name it */
export type StartScope =
  | Readonly<{ kind: 'genre'; name: string }>
  | Readonly<{ kind: 'country'; name: string }>
  | Readonly<{ kind: 'theme' }>;

/** "Crime series", "series from Denmark", "series with this theme" */
const seriesOf = (scope: StartScope, longRunning: boolean) => {
  const adjective = longRunning ? 'long-running ' : '';
  switch (scope.kind) {
    case 'genre':
      return `${adjective}${scope.name} series`;
    case 'country':
      return `${adjective}series from ${scope.name}`;
    case 'theme':
      return `${adjective}series with this theme`;
  }
};

/**
 * The line under a Where to start pick, from the show's own numbers. A
 * superlative names the slot's own pool, so it holds for every landing
 * kind: the favourite is the most-voted series from its country; the long
 * haul (5+ seasons) the most-voted long-running series of the genre, the
 * country or the theme. A pick that isn't its slot's top (`first: false`: a
 * backup, or a show an earlier slot took) is "among" them, never "the".
 */
export const whyLine = (
  kind: WhereToStartPick['kind'],
  show: DurationShow,
  scope: StartScope,
  first = true,
) => {
  const episodes = `${show.numberOfEpisodes} ${show.numberOfEpisodes === 1 ? 'episode' : 'episodes'}`;
  const seasons = `${show.numberOfSeasons} ${show.numberOfSeasons === 1 ? 'season' : 'seasons'}`;
  if (kind === 'favourite' || kind === 'long-haul') {
    const pool = seriesOf(scope, kind === 'long-haul');
    return first
      ? `${seasons}, and the most-voted ${pool} on TMDB`
      : `${seasons}, among the most-voted ${pool} on TMDB`;
  }
  // the card's meta writes the length the same way ("9h 18m")
  const length = formatRuntime(show.totalMinutes);
  return length ? `${episodes}, ${length} in all` : episodes;
};
