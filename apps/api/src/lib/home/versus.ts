import type { TvSeries, VersusPair, VersusSide } from '@tvseri.es/schemas';
import { formatSeriesYears, rotationIndex } from '@tvseri.es/utils';

import { logWarn } from '@/utils/logWarn';

/** Pairs in the day's deck (the viewer's filter on the web leaves some out) */
export const VERSUS_DECK_SIZE = 6;
/** Seeds tried before the deck stops short: bounds the cold build's calls */
const MAX_SEEDS = 10;
/** Votes that make a series well known */
export const VERSUS_MIN_VOTES = 300;
/** The less-voted of the two has at least a third of the other's votes */
const VOTE_RATIO = 3;
/** Kids, news, reality, soap, talk: not series anyone weighs up like this */
const LEFT_OUT_GENRES: ReadonlySet<number> = new Set([
  10762, 10763, 10764, 10766, 10767,
]);

/** Called with the number of lookups that failed while building */
type Report = (failed: number) => void;

export type VersusSource = Readonly<{
  /** The series' details: aired seasons and episodes, status, last air date */
  details: (id: number) => Promise<TvSeries | undefined>;
  /** Asked before every seed after the first: false when out of time */
  hasTime?: () => boolean;
  /** Well-known series to start pairs from, in a stable order */
  seeds: () => Promise<ReadonlyArray<TvSeries>>;
  /** TMDB's recommendations for a series, most similar first */
  similarTo: (id: number) => Promise<ReadonlyArray<TvSeries>>;
}>;

/** Well known, with a poster, and not a kind of TV the toy leaves out */
const isPairable = (series: TvSeries) =>
  !!series.posterImage &&
  series.voteCount >= VERSUS_MIN_VOTES &&
  !series.genres.some((genre) => LEFT_OUT_GENRES.has(genre.id));

/** Two different series that share a genre and are close in votes */
export const areSimilar = (a: TvSeries, b: TvSeries) => {
  if (a.id === b.id || a.voteCount <= 0 || b.voteCount <= 0) {
    return false;
  }
  const genres = new Set(a.genres.map((genre) => genre.id));
  const low = Math.min(a.voteCount, b.voteCount);
  const high = Math.max(a.voteCount, b.voteCount);
  return (
    b.genres.some((genre) => genres.has(genre.id)) && high <= low * VOTE_RATIO
  );
};

/** What the card draws of a series; undefined without a poster or an aired episode */
export const toVersusSide = (series: TvSeries): VersusSide | undefined => {
  const episodes = series.numberOfAiredEpisodes;
  if (!series.posterImage || episodes <= 0) {
    return undefined;
  }
  const seasons = series.seasons
    ? series.seasons.filter((season) => (season.numberOfAiredEpisodes ?? 0) > 0)
        .length
    : series.numberOfSeasons;
  return {
    episodes,
    id: series.id,
    posterImage: series.posterImage,
    seasons,
    slug: series.slug,
    title: series.title,
    // one decimal: the web draws "8.4", and the emphasis compares what it draws
    voteAverage: Math.round(series.voteAverage * 10) / 10,
    years: formatSeriesYears(series),
  };
};

/** The day's seeds, starting at a date-pure place in the list and wrapping */
const inDayOrder = (date: string, seeds: ReadonlyArray<TvSeries>) => {
  const start = rotationIndex(date, seeds.length, 'versus');
  return [...seeds.slice(start), ...seeds.slice(0, start)];
};

/**
 * The day's Versus deck: from well-known seeds (in the day's order), each
 * seed's first TMDB recommendation that shares a genre with it and has
 * votes within three times of its own makes a pair, never a series twice.
 * Up to VERSUS_DECK_SIZE pairs from at most MAX_SEEDS seeds: one call for
 * the seeds, one per seed tried and two per pair (the details). The same
 * for everyone; built once a day (toy.ts).
 */
export async function buildVersusDeck(
  date: string,
  source: VersusSource,
  report: Report,
): Promise<VersusPair[]> {
  const seeds = inDayOrder(date, (await source.seeds()).filter(isPairable));
  const used = new Set<number>();
  const pairs: VersusPair[] = [];
  let tried = 0;
  for (const seed of seeds) {
    if (pairs.length >= VERSUS_DECK_SIZE || tried >= MAX_SEEDS) {
      break;
    }
    if (used.has(seed.id)) {
      continue;
    }
    if (tried > 0 && source.hasTime && !source.hasTime()) {
      report(1);
      break;
    }
    tried += 1;
    try {
      const partner = (await source.similarTo(seed.id)).find(
        (candidate) =>
          !used.has(candidate.id) &&
          isPairable(candidate) &&
          areSimilar(seed, candidate),
      );
      if (!partner) {
        continue;
      }
      const [left, right] = await Promise.all([
        source.details(seed.id),
        source.details(partner.id),
      ]);
      const leftSide = left && toVersusSide(left);
      const rightSide = right && toVersusSide(right);
      if (leftSide && rightSide) {
        pairs.push({ left: leftSide, right: rightSide });
        used.add(seed.id);
        used.add(partner.id);
      }
    } catch (error) {
      logWarn(`Versus: seed ${seed.id} failed, trying the next one`, error);
      report(1);
    }
  }
  return pairs;
}
