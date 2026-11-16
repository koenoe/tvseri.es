import type { DidYouKnowFact, TvSeries } from '@tvseri.es/schemas';

type FactType = DidYouKnowFact['type'];

const DEFAULT_RUNTIME = 45;

/** First in the deck on a tie: the board's order */
const ORDER: ReadonlyArray<FactType> = ['hours', 'episodes', 'years'];

/** An episode's length in minutes: the last aired one's, else 45 */
export const runtimeOf = (series: TvSeries) =>
  series.lastEpisodeToAir?.runtime || DEFAULT_RUNTIME;

/** Years from first to last air date: an ended show only */
const yearsOnAir = (series: TvSeries) =>
  series.status === 'Ended' && series.lastAirDate && series.firstAirDate
    ? new Date(series.lastAirDate).getUTCFullYear() -
      new Date(series.firstAirDate).getUTCFullYear()
    : 0;

const factOf = (series: TvSeries, type: FactType): DidYouKnowFact => {
  switch (type) {
    case 'years':
      return { series, type, value: yearsOnAir(series) };
    case 'episodes':
      return { series, type, value: series.numberOfEpisodes };
    case 'hours':
      return {
        series,
        type,
        value: Math.round((series.numberOfEpisodes * runtimeOf(series)) / 60),
      };
  }
};

/**
 * Did you know's deck: one fact per show, in the shows' order, the types
 * alternating. Each show takes the type least used so far that its
 * neighbours don't have ("Another" wraps, so the last one's neighbour is the
 * first); years only for an ended show that ran two years or more. Hours and
 * episodes fit every show, so neighbours always differ from two shows up.
 */
export function factDeck(
  shows: ReadonlyArray<TvSeries>,
): ReadonlyArray<DidYouKnowFact> {
  const used = new Map<FactType, number>();
  const types: FactType[] = [];
  shows.forEach((series, index) => {
    const fits = ORDER.filter(
      (type) => type !== 'years' || yearsOnAir(series) >= 2,
    );
    const taken = new Set([types[index - 1]]);
    if (index > 0 && index === shows.length - 1) {
      taken.add(types[0]);
    }
    const free = fits.filter((type) => !taken.has(type));
    const notPrevious = fits.filter((type) => type !== types[index - 1]);
    const options = [free, notPrevious, fits].find((list) => list.length > 0)!;
    const type = options.reduce((best, option) =>
      (used.get(option) ?? 0) < (used.get(best) ?? 0) ? option : best,
    );
    types.push(type);
    used.set(type, (used.get(type) ?? 0) + 1);
  });
  return shows.map((series, index) => factOf(series, types[index]!));
}
