import {
  hasEnoughPosters,
  type LandingFilter,
  landingFilter,
  landingSlugForId,
  NETWORKS,
  themeBySlug,
} from '@tvseri.es/constants';
import type { GoDeeper, GoDeeperCard, TvSeries } from '@tvseri.es/schemas';

import { fetchTrending } from '@/lib/mdblist';
import {
  fetchDiscoverCount,
  fetchDiscoverTvSeries,
  fetchPersonTvCredits,
  fetchTvSeriesBase,
  fetchTvSeriesKeywords,
} from '@/lib/tmdb';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { mapSettled } from '@/utils/limit';

import { essentialsNetwork, rotateSeeds } from './rotation';

const ITEMS_PER_CARD = 3;
const ESSENTIALS_ROW_SIZE = 20;
/** Trending shows the cards start from (the home spotlight shows 10) */
const MAX_SEEDS = 10;
/** Themes tried per seed before moving on to the next seed */
const THEMES_PER_SEED = 3;
/** Votes a destination's shows need, so a card leads to something worth it */
const MIN_THEME_VOTES = 300;
const MIN_NETWORK_VOTES = 500;
const MIN_ESSENTIALS_VOTES = 250;

type Theme = Readonly<{
  /** the theme's strongest keyword, name and slug: the card's destination */
  to: Readonly<{ id: number; name: string; slug: string }>;
  filter: LandingFilter;
  /** the keyword the seed carries, as TMDB names it ("cyberpunk") */
  tagged: string;
}>;
type Seed = Readonly<{
  series: TvSeries;
  themes: ReadonlyArray<Theme>;
  /** place in the trending list, 1 = first */
  rank: number;
}>;

type Candidate = Omit<GoDeeperCard, 'from' | 'kind'>;

/** Shows with a poster that are neither the seed nor already on this part of the page */
const fresh = (
  items: ReadonlyArray<TvSeries>,
  seed: TvSeries,
  shown: ReadonlySet<number>,
) =>
  items.filter(
    (series) =>
      series.posterImage && series.id !== seed.id && !shown.has(series.id),
  );

/** Three shows, or nothing when too few are left (the card is skipped) */
const pickItems = (items: ReadonlyArray<TvSeries>) =>
  items.length >= ITEMS_PER_CARD ? items.slice(0, ITEMS_PER_CARD) : undefined;

type Source = (
  seed: Seed,
  context: Readonly<{ shown: ReadonlySet<number>; essentialsId: number }>,
) => Promise<Candidate | undefined>;

const themeCard: Source = async ({ series, themes }, { shown }) => {
  for (const theme of themes) {
    const { items } = await fetchDiscoverTvSeries({
      ...theme.filter,
      sort_by: 'vote_average.desc',
      'vote_count.gte': MIN_THEME_VOTES,
    });
    const picked = pickItems(fresh(items, series, shown));
    if (picked) {
      return {
        items: picked,
        to: theme.to,
        total: await fetchDiscoverCount(theme.filter),
        why: `Also tagged ${theme.tagged.toLowerCase()}, like ${series.title}.`,
      };
    }
  }
  return undefined;
};

const creatorCard: Source = async ({ series }, { shown }) => {
  const creator = series.createdBy?.[0];
  if (!creator) {
    return undefined;
  }

  const credits = await fetchPersonTvCredits(creator.id);
  const known = new Map(
    [...(credits?.crew.previous ?? []), ...(credits?.cast.previous ?? [])]
      .filter((show) => show.id !== series.id && show.posterImage)
      .map((show) => [show.id, show]),
  );
  const best = [...known.values()]
    .filter((show) => show.voteCount >= MIN_THEME_VOTES)
    .sort((a, b) => b.voteAverage - a.voteAverage);
  const picked = pickItems(fresh(best, series, shown));

  return picked
    ? {
        items: picked,
        to: { id: creator.id, name: creator.name, slug: creator.slug },
        total: known.size,
        why: `More from ${creator.name}, who created ${series.title}.`,
      }
    : undefined;
};

const networkCard: Source = async ({ series }, { essentialsId, shown }) => {
  const network = NETWORKS.find(
    (candidate) => candidate.id === series.network?.id,
  );
  // The row above is already this network's Essentials
  if (!network || network.id === essentialsId) {
    return undefined;
  }

  const filter = { with_networks: network.id };
  const { items } = await fetchDiscoverTvSeries({
    ...filter,
    sort_by: 'vote_average.desc',
    'vote_count.gte': MIN_NETWORK_VOTES,
  });
  const picked = pickItems(fresh(items, series, shown));

  return picked
    ? {
        items: picked,
        to: { id: network.id, name: network.name, slug: network.slug },
        total: await fetchDiscoverCount(filter),
        why: `More from ${network.name}, where ${series.title} aired.`,
      }
    : undefined;
};

/** In this order; a kind with no valid card is left out */
const SOURCES: ReadonlyArray<readonly [GoDeeperCard['kind'], Source]> = [
  ['theme', themeCard],
  ['creator', creatorCard],
  ['network', networkCard],
];

/**
 * A seed's themes, in its keywords' order: one per theme, whichever keyword
 * of the theme's set the seed carries (the first one names the card's why).
 */
const seedThemes = (
  keywords: ReadonlyArray<Readonly<{ id: number | string; name: string }>>,
): ReadonlyArray<Theme> => {
  const themes = new Map<string, Theme>();
  for (const keyword of keywords) {
    const slug = landingSlugForId('theme', Number(keyword.id));
    const theme = slug ? themeBySlug(slug) : undefined;
    const filter = slug ? landingFilter('theme', slug) : undefined;
    const [id] = theme?.keywordIds ?? [];
    if (slug && theme && filter && id !== undefined && !themes.has(slug)) {
      themes.set(slug, {
        filter,
        tagged: keyword.name,
        to: { id, name: theme.name, slug },
      });
    }
  }
  return [...themes.values()].slice(0, THEMES_PER_SEED);
};

const loadSeeds = async (ids: ReadonlyArray<number>): Promise<Seed[]> =>
  mapSettled(
    ids.map((id, index) => ({ id, rank: index + 1 })),
    async ({ id, rank }) => {
      const [series, keywords] = await Promise.all([
        fetchTvSeriesBase(id),
        fetchTvSeriesKeywords(id),
      ]);
      if (!series) {
        return undefined;
      }
      return { rank, series, themes: seedThemes(keywords ?? []) };
    },
    TMDB_CONCURRENCY,
  );

/**
 * The Discover hub's Essentials row (one network a day) and the rabbit holes
 * below it. Everything follows from the date and TMDB: the same day gives the
 * same answer. Every card is checked against what is shown above it (the
 * Essentials row and the cards before it); a card left with fewer than three
 * new shows takes the next trending show as its start.
 */
export const buildGoDeeper = async (date: string): Promise<GoDeeper> => {
  const network = essentialsNetwork(date);
  const essentialsFilter = { with_networks: network.id };

  const [{ items: essentialsItems }, essentialsTotal, trending] =
    await Promise.all([
      fetchDiscoverTvSeries({
        ...essentialsFilter,
        sort_by: 'vote_average.desc',
        'vote_count.gte': MIN_ESSENTIALS_VOTES,
      }),
      fetchDiscoverCount(essentialsFilter),
      fetchTrending(),
    ]);

  const withPosters = essentialsItems
    .filter((series) => series.posterImage)
    .slice(0, ESSENTIALS_ROW_SIZE);
  // Under three posters the row is left out, and the cards needn't avoid it
  const essentialsRow = hasEnoughPosters(withPosters.length) ? withPosters : [];

  // A different start every day, so the cards don't always begin on the same show
  const seeds = rotateSeeds(
    await loadSeeds(trending.slice(0, MAX_SEEDS)),
    date,
  );

  const shown = new Set(essentialsRow.map((series) => series.id));
  const cards: GoDeeperCard[] = [];

  for (const [kind, source] of SOURCES) {
    for (const seed of seeds) {
      const candidate = await source(seed, { essentialsId: network.id, shown });
      if (candidate) {
        for (const item of candidate.items) {
          shown.add(item.id);
        }
        cards.push({
          ...candidate,
          from: {
            id: seed.series.id,
            rank: seed.rank,
            title: seed.series.title,
          },
          kind,
        });
        break;
      }
    }
  }

  return {
    cards,
    date,
    essentials: {
      items: essentialsRow,
      network: { id: network.id, name: network.name, slug: network.slug },
      total: essentialsTotal,
    },
  };
};
