import {
  allOf,
  type LandingFilter,
  landingFilter,
  landingSlugForId,
  themeBySlug,
} from '@tvseri.es/constants';
import type { LandingGenreShare, LandingThemeChip } from '@tvseri.es/schemas';

import {
  fetchDiscoverCount,
  fetchDiscoverTvSeries,
  fetchGenresForTvSeries,
  fetchTvSeriesKeywords,
} from '@/lib/tmdb';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { createLimiter, mapSettled } from '@/utils/limit';

/** A tab or chip needs this many shows to be worth showing */
export const MIN_SHOWS = 12;

/** Keywords looked at per landing: tagged on the most popular shows */
const SAMPLE_PAGES = [1, 2];
const POOL_SIZE = 12;
export const MAX_CHIPS = 6;

/** Decades 1950s-2020s, newest last */
const DECADE_SLUGS = [
  '1950s',
  '1960s',
  '1970s',
  '1980s',
  '1990s',
  '2000s',
  '2010s',
  '2020s',
];

/**
 * Counts shows for a filter. One limiter per landing keeps all its TMDB calls
 * (which run side by side) within `TMDB_CONCURRENCY` in total.
 */
export type Limited = <T>(fn: () => Promise<T>) => Promise<T>;
export type Counter = (filter: LandingFilter) => Promise<number>;

export const createLimited = (): Limited => createLimiter(TMDB_CONCURRENCY);

export const createCounter =
  (limited: Limited): Counter =>
  (filter) =>
    limited(() => fetchDiscoverCount(filter));

const percentOf = (count: number, total: number) =>
  total === 0 ? 0 : Math.round((count * 100) / total);

/** Biggest first; equal counts by id, so the order never flips between runs */
export const byCountThenId = (
  a: Readonly<{ count: number; id: number }>,
  b: Readonly<{ count: number; id: number }>,
) => b.count - a.count || a.id - b.id;

/** Decades' first-air-date windows merged into a base filter */
export const decadeFilters = (base: LandingFilter) =>
  DECADE_SLUGS.map((slug) => ({
    filter: { ...base, ...landingFilter('decade', slug) },
    slug,
  }));

/**
 * Genres next to a landing: each TMDB genre (but `exceptId`) counted together
 * with the landing's shows, biggest first. Genres without a shared show are
 * left out.
 */
export const genreShares = async ({
  count,
  exceptId,
  filter,
  total,
}: Readonly<{
  count: Counter;
  exceptId?: number;
  /** The landing's own filter: each genre is counted together with it */
  filter: LandingFilter;
  total: number;
}>): Promise<LandingGenreShare[]> => {
  const genres = (await fetchGenresForTvSeries()).filter(
    (genre) => genre.id !== exceptId,
  );
  const withCounts = await Promise.all(
    genres.map(async (genre) => ({
      count: await count(allOf(filter, { with_genres: String(genre.id) })),
      id: genre.id,
      name: genre.name,
      slug: landingSlugForId('genre', genre.id) ?? '',
    })),
  );

  return withCounts
    .filter((genre) => genre.count > 0 && genre.slug)
    .sort(byCountThenId)
    .map((genre) => ({ ...genre, percent: percentOf(genre.count, total) }));
};

/**
 * The themes tagged most often on a landing's most popular shows (the first
 * two discover pages, so up to 40): a show counts once per theme, whichever
 * keywords of the theme's set it carries. Only themes, so every chip can link
 * somewhere; a chip is named as the theme list names it, with the theme's
 * strongest keyword as its id. A sample, not a full count: the caller counts
 * each candidate exactly (`rankThemes`).
 */
export const themeCandidates = async ({
  base,
  exceptSlug,
  limited,
}: Readonly<{
  base: LandingFilter;
  /** the landing's own theme, never its own chip */
  exceptSlug?: string;
  limited: Limited;
}>): Promise<Array<Omit<LandingThemeChip, 'count'>>> => {
  const pages = await Promise.all(
    SAMPLE_PAGES.map((page) =>
      limited(() =>
        fetchDiscoverTvSeries({
          ...base,
          page,
          sort_by: 'popularity.desc',
        }),
      ),
    ),
  );
  const ids = [
    ...new Set(pages.flatMap((page) => page.items.map((i) => i.id))),
  ];
  const keywordLists = await mapSettled(
    ids,
    (id) => limited(() => fetchTvSeriesKeywords(id)),
    ids.length,
  );

  const seen = new Map<string, number>();
  for (const keywords of keywordLists) {
    const themes = new Set(
      keywords.flatMap((keyword) => {
        const slug = landingSlugForId('theme', Number(keyword.id));
        return slug && slug !== exceptSlug ? [slug] : [];
      }),
    );
    for (const slug of themes) {
      seen.set(slug, (seen.get(slug) ?? 0) + 1);
    }
  }

  return [...seen]
    .flatMap(([slug, n]) => {
      const theme = themeBySlug(slug);
      const [id] = theme?.keywordIds ?? [];
      return theme && id !== undefined
        ? [{ chip: { id, name: theme.name, slug }, n }]
        : [];
    })
    .sort((a, b) => b.n - a.n || a.chip.id - b.chip.id)
    .slice(0, POOL_SIZE)
    .map(({ chip }) => chip);
};

/** A theme chip's own filter (the chips only ever name themes) */
export const chipFilter = (chip: Readonly<{ slug: string }>): LandingFilter =>
  landingFilter('theme', chip.slug) ?? {};

/** Counts each candidate with `countFor`, keeping those with shows, biggest first */
export const rankThemes = async (
  candidates: ReadonlyArray<Omit<LandingThemeChip, 'count'>>,
  countFor: (theme: LandingFilter) => Promise<number>,
): Promise<LandingThemeChip[]> => {
  const counted = await Promise.all(
    candidates.map(async (candidate) => ({
      ...candidate,
      count: await countFor(chipFilter(candidate)),
    })),
  );
  return counted.filter((chip) => chip.count > 0).sort(byCountThenId);
};
