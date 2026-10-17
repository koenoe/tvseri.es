import type { Episode, Season, TvSeries } from '@tvseri.es/schemas';
import { diceCoefficient } from 'dice-coefficient';
import slugify from 'slugify';

import { parseEpisodeNumber, parseSeasonNumber } from './parseEntry';
import type { ImportCell } from './types';

const DICE_COEFFICIENT_THRESHOLD = 0.75;
// Slugs shorter than this (e.g. '' for CJK titles) would "contain" anything
const MIN_FUZZY_SLUG_LENGTH = 3;

export type Catalog = Readonly<{
  searchTvSeries: (title: string) => Promise<ReadonlyArray<TvSeries>>;
  getTvSeries: (id: number) => Promise<TvSeries | null | undefined>;
  getSeason: (
    id: number,
    seasonNumber: number,
  ) => Promise<Season | null | undefined>;
}>;

type Match = 'exact' | 'similar' | 'none';

const toSlug = (value: string) => slugify(value, { lower: true, strict: true });

const compareTitles = (a: string, b: string): Match => {
  const slugA = toSlug(a);
  const slugB = toSlug(b);
  if (
    slugA ? slugA === slugB : a.trim().toLowerCase() === b.trim().toLowerCase()
  ) {
    return 'exact';
  }
  if (
    slugA.length < MIN_FUZZY_SLUG_LENGTH ||
    slugB.length < MIN_FUZZY_SLUG_LENGTH
  ) {
    return 'none';
  }
  return slugA.includes(slugB) ||
    slugB.includes(slugA) ||
    diceCoefficient(slugA, slugB) > DICE_COEFFICIENT_THRESHOLD
    ? 'similar'
    : 'none';
};

const normalizeTitle = (title: string) =>
  title
    .toLowerCase()
    // TMDB search doesn't handle "(TV)" or the U.K./U.S. abbreviations well
    .replace('(tv)', '')
    .replace(/\(u\.k\.\)/g, '(uk)')
    .replace(/\(u\.s\.\)/g, '(us)')
    .trim();

export type MatchResult =
  | Readonly<{
      tvSeries: TvSeries;
      episode: Episode;
      seasonNumber: number;
    }>
  | Readonly<{ error: string }>;

/**
 * Matches import rows to catalogue episodes. Create one per request: the
 * maps here only dedupe lookups within a request (cross-request caching
 * belongs in the catalogue, e.g. `'use cache'`).
 */
export const createEpisodeMatcher = (catalog: Catalog) => {
  const seriesByTitle = new Map<string, TvSeries | null>();
  const seasons = new Map<string, Season | null>();

  const getSeason = async (id: number, seasonNumber: number) => {
    const key = `${id}-${seasonNumber}`;
    if (!seasons.has(key)) {
      seasons.set(key, (await catalog.getSeason(id, seasonNumber)) ?? null);
    }
    return seasons.get(key) ?? null;
  };

  const findEpisode = async (
    tvSeries: TvSeries,
    seasonNumber: number,
    episodeCell: ImportCell,
  ): Promise<Episode | null> => {
    const episodes = (await getSeason(tvSeries.id, seasonNumber))?.episodes;
    if (!episodes?.length) {
      return null;
    }

    const episodeNumber = parseEpisodeNumber(episodeCell);
    const byNumber = episodes.find((e) => e.episodeNumber === episodeNumber);
    if (byNumber) {
      return byNumber;
    }

    const episodeTitle = String(episodeCell);
    const matches = episodes.map((e) => compareTitles(e.title, episodeTitle));
    const index =
      matches.indexOf('exact') >= 0
        ? matches.indexOf('exact')
        : matches.indexOf('similar');
    return episodes[index] ?? null;
  };

  const findSeries = async (
    title: string,
    seasonNumber: number,
    episodeCell: ImportCell,
  ): Promise<TvSeries | null> => {
    const results = await catalog.searchTvSeries(title);
    const exactMatches = results.filter(
      (result) => compareTitles(result.title, title) === 'exact',
    );

    // Several series can share a title (e.g. "The Staircase"): pick the one
    // that has the episode
    for (const result of exactMatches) {
      const tvSeries = await catalog.getTvSeries(result.id);
      if (
        tvSeries &&
        (await findEpisode(tvSeries, seasonNumber, episodeCell))
      ) {
        return tvSeries;
      }
    }

    const fallback =
      results.find(
        (result) => compareTitles(result.title, title) === 'similar',
      ) ?? results[0];
    return fallback ? ((await catalog.getTvSeries(fallback.id)) ?? null) : null;
  };

  const match = async (
    row: Readonly<{ title: string; season: ImportCell; episode: ImportCell }>,
  ): Promise<MatchResult> => {
    const title = normalizeTitle(row.title);
    const seasonNumber = parseSeasonNumber(row.season);

    if (!seriesByTitle.has(title)) {
      seriesByTitle.set(
        title,
        await findSeries(title, seasonNumber, row.episode),
      );
    }
    const tvSeries = seriesByTitle.get(title);
    if (!tvSeries) {
      return { error: `Could not find series: "${title}"` };
    }

    const episode = await findEpisode(tvSeries, seasonNumber, row.episode);
    if (!episode) {
      return { error: `Could not find episode: "${row.episode}"` };
    }

    return { episode, seasonNumber, tvSeries };
  };

  return { match };
};
