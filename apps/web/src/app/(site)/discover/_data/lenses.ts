import 'server-only';

import { hasEnoughPosters, networkBySlug } from '@tvseri.es/constants';
import { DURATION_BUCKETS } from '@tvseri.es/schemas';
import {
  getLandingCounts,
  landingCountsKey,
} from '@/app/(site)/_discover/data/counts';
import {
  discoverQueryString,
  getDiscoverShows,
} from '@/app/(site)/_discover/data/discover';
import {
  getDurationPage,
  getDurationTiles,
} from '@/app/(site)/_discover/data/duration';
import {
  DEFAULT_LOGO_RATIO,
  getNetworkDetails,
} from '@/app/(site)/_discover/data/network';
import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';
import landingPath from '@/lib/routing/landingPath';

import { formatCount } from './format';
import { type HubShow, withNetwork } from './hubShow';
import {
  COUNTRY_TILES,
  type CountSource,
  DECADE_TILES,
  DECADES_BEFORE_1990,
  DURATION_TILES,
  LANGUAGE_TILES,
  type LensKey,
  type LinkTileEntry,
  NETWORK_TILES,
  ROW_LENGTH,
  THEME_TILES,
  TOP_RATED_FILTER,
} from './hubTiles';
import {
  buildDecadeTiles,
  buildDurationTiles,
  buildLinkTiles,
  countKey,
  decadeRowKey,
  durationDressIds,
  durationRowKey,
  type LensTileView,
  type TileWordmark,
  wordmarkNetwork,
} from './lensModel';

/** A lens's tiles, or `Unavailable` when its tiles come from a read that failed (Duration) */
export type LensPanels = Readonly<
  Record<LensKey, ReadonlyArray<LensTileView> | Unavailable>
>;

const LINK_LENSES = {
  country: COUNTRY_TILES,
  language: LANGUAGE_TILES,
  network: NETWORK_TILES,
  theme: THEME_TILES,
} as const satisfies Partial<Record<LensKey, ReadonlyArray<LinkTileEntry>>>;

/**
 * A missing count leaves that line out; the tile stays. Nothing here is
 * cached: the grid renders with the page, and an unavailable read is an
 * `unavailable` entry, so the page regenerates without it on a visit 30 s on.
 */
const orNull = <T>(value: T | Unavailable): T | null =>
  isUnavailable(value) ? null : value;

async function loadCounts(sources: ReadonlyArray<CountSource>) {
  const counts = new Map<string, number>();
  const byType = new Map<string, string[]>();
  const queries: string[] = [];
  for (const source of sources) {
    if ('query' in source) {
      queries.push(source.query);
    } else {
      byType.set(source.type, [
        ...(byType.get(source.type) ?? []),
        source.slug,
      ]);
    }
  }
  await Promise.all([
    ...[...byType].map(async ([type, slugs]) => {
      const result = orNull(
        await getLandingCounts(
          type as Exclude<CountSource, { query: string }>['type'],
          landingCountsKey(slugs),
        ),
      );
      for (const [slug, count] of Object.entries(result ?? {})) {
        counts.set(`${type}:${slug}`, count);
      }
    }),
    ...queries.map(async (query) => {
      const result = orNull(
        await getDiscoverShows(
          discoverQueryString(Object.fromEntries(new URLSearchParams(query))),
        ),
      );
      if (result) {
        counts.set(countKey({ query }), result.total);
      }
    }),
  ]);
  return counts;
}

/**
 * The network tiles' wordmarks (TMDB's logos, `getNetworkDetails`, cached
 * `long` and shared with the network landings), by the tile's `href`; a
 * network without a logo, or whose read failed, keeps its name
 */
async function loadWordmarks(entries: ReadonlyArray<LinkTileEntry>) {
  const found = await Promise.all(
    entries.map(async (entry) => {
      const slug = wordmarkNetwork(entry);
      const network = slug ? networkBySlug(slug) : undefined;
      if (!network) {
        return null;
      }
      const details = orNull(await getNetworkDetails(network.id));
      if (!details?.logo) {
        return null;
      }
      const wordmark: TileWordmark = {
        ratio: details.logoRatio ?? DEFAULT_LOGO_RATIO,
        silhouette: details.logoSilhouette,
        src: details.logo,
      };
      return [entry.href, wordmark] as const;
    }),
  );
  return new Map(found.filter((item) => item !== null));
}

async function before1990Count() {
  const counts = orNull(
    await getLandingCounts('decade', landingCountsKey(DECADES_BEFORE_1990)),
  );
  return counts
    ? DECADES_BEFORE_1990.reduce((sum, slug) => sum + (counts[slug] ?? 0), 0)
    : undefined;
}

/**
 * Every lens's five tiles, so a tab switch swaps them on the client with no
 * request. The hand-picked tiles' art is stored (`hubTiles.ts`), so the grid
 * reads only the Duration tiles, the counts (each cached by its own loader,
 * `medium`) and the network tiles' wordmarks (`long`); the hub renders it
 * into its static shell. Duration is `Unavailable` without its tiles; the
 * other lenses only lose their counts (and Network its wordmarks).
 */
export async function getLensPanels(): Promise<LensPanels> {
  const linkEntries = Object.values(LINK_LENSES).flat();
  const [durationTiles, counts, before1990, wordmarks] = await Promise.all([
    getDurationTiles(),
    loadCounts(
      linkEntries.flatMap((entry) => (entry.count ? [entry.count] : [])),
    ),
    before1990Count(),
    loadWordmarks(LINK_LENSES.network),
  ]);
  return {
    country: buildLinkTiles(LINK_LENSES.country, counts),
    decade: buildDecadeTiles(DECADE_TILES, before1990),
    duration: isUnavailable(durationTiles)
      ? durationTiles
      : buildDurationTiles(durationTiles, DURATION_TILES),
    language: buildLinkTiles(LINK_LENSES.language, counts),
    network: buildLinkTiles(LINK_LENSES.network, counts, wordmarks),
    theme: buildLinkTiles(LINK_LENSES.theme, counts),
  };
}

/** A tile's row, opened in place under the grid */
export type LensRowView = Readonly<{
  key: string;
  title: string;
  /** the tile's own meta line, beside the title */
  line: string;
  /** the decade's landing; the title links to it */
  href: string | null;
  items: ReadonlyArray<HubShow>;
}>;

/** The rows Duration and Decade tiles open, keyed like `LensTileView.action.row` */
export const LENS_ROWS: ReadonlyArray<
  Readonly<{ key: string; title: string }>
> = [
  ...DURATION_BUCKETS.map((bucket) => ({
    key: durationRowKey(bucket),
    title: DURATION_TILES[bucket].name,
  })),
  ...DECADE_TILES.map((entry) => ({
    key: decadeRowKey(entry),
    title: entry.name,
  })),
];

/** One in-place row's shows: a Duration tile's first page, or a decade's best rated */
export async function getLensRow(
  key: string,
): Promise<LensRowView | null | Unavailable> {
  const bucket = DURATION_BUCKETS.find((item) => durationRowKey(item) === key);
  if (bucket) {
    const entry = DURATION_TILES[bucket];
    const [tiles, page] = await Promise.all([
      getDurationTiles(),
      getDurationPage(bucket),
    ]);
    if (isUnavailable(page)) {
      return page;
    }
    const tile = orNull(tiles)?.find((item) => item.bucket === bucket);
    const count = tile?.count;
    // the tile right above already shows these (Chernobyl dresses
    // Under 6 hours, so its row starts with the next show)
    const drawn = new Set(
      tile ? durationDressIds(tile.preview, entry.dress) : [],
    );
    // the dress's shows stay in when leaving them out would leave too few;
    // a list under three shows opens empty ("No series here yet"), never as
    // a row of one
    const rest = page.items.filter((show) => !drawn.has(show.id));
    const items = hasEnoughPosters(rest.length) ? rest : page.items;
    return {
      href: null,
      items: hasEnoughPosters(items.length)
        ? items.slice(0, ROW_LENGTH).map(withNetwork)
        : [],
      key,
      line:
        entry.line ??
        (count === undefined ? '' : formatCount(count, 'miniseries')),
      title: entry.name,
    };
  }
  const decade = DECADE_TILES.find((entry) => decadeRowKey(entry) === key);
  if (!decade) {
    return null;
  }
  const [shows, before1990] = await Promise.all([
    getDiscoverShows(
      discoverQueryString({ ...decade.filter, ...TOP_RATED_FILTER }),
    ),
    decade.line ? undefined : before1990Count(),
  ]);
  if (isUnavailable(shows)) {
    return shows;
  }
  return {
    href: decade.slug ? landingPath('decade', decade.slug) : null,
    items: shows.items.slice(0, ROW_LENGTH).map(withNetwork),
    key,
    line:
      decade.line ??
      (before1990 === undefined ? '' : formatCount(before1990, 'series')),
    title: decade.name,
  };
}
