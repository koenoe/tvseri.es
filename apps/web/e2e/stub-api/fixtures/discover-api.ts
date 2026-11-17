import type {
  DurationShow,
  LandingCounts,
  SeriesSummaries,
  WhereToStart,
  WhereToStartPick,
} from '@tvseri.es/schemas';

// The source file, not the package: Node strips types only outside node_modules.
import { landingFilter } from '../../../../../packages/constants/src/landings';
import type { StubRoute } from '../types';
import type { CatalogueShow } from './discover/catalogue';
import { byId, networkId, SHOWS } from './discover/shows';
import { matching } from './discover-catalogue';

/**
 * The discover routes (counts for the hub's tiles, summaries for meta
 * lines, Where to start for themes and countries), with realistic numbers.
 */

const KNOWN_COUNTS: Readonly<Record<string, Readonly<Record<string, number>>>> =
  {
    country: { de: 2980, dk: 1120, es: 1650, gb: 7240, jp: 9800, kr: 4100 },
    decade: {
      '1940s': 40,
      '1950s': 210,
      '1960s': 380,
      '1970s': 620,
      '1980s': 1060,
      '1990s': 4900,
      '2000s': 12_600,
      '2010s': 41_800,
      '2020s': 23_500,
    },
    genre: {
      'action-adventure': 9900,
      animation: 18_200,
      comedy: 20_001,
      crime: 10_927,
      documentary: 24_800,
      drama: 38_400,
      family: 7700,
      mystery: 6100,
      reality: 14_700,
      'sci-fi-fantasy': 9625,
      'war-politics': 1600,
      western: 420,
    },
    language: { de: 3100, es: 9400, ja: 16_900, nl: 1300 },
    network: { 'apple-tv': 244, 'bbc-one': 2950, hbo: 412, netflix: 3100 },
    theme: {
      detectives: 1940,
      dystopia: 146,
      'organised-crime': 1130,
      'set-in-the-1980s': 1890,
      'time-travel': 410,
    },
  };

const minutes = (show: CatalogueShow) => show.episodes * show.runtime;
const ended = (show: CatalogueShow) =>
  show.ended ?? show.year + show.seasons < 2025;

const toDurationShow = (show: CatalogueShow): DurationShow => {
  const entry = SHOWS.find((item) => item.show === show);
  const series = entry?.series;
  return {
    backdropImage: series?.backdropImage ?? '',
    id: series?.id ?? 0,
    network: { id: networkId(show.network), name: show.network },
    numberOfEpisodes: show.episodes,
    numberOfSeasons: show.seasons,
    posterImage: series?.posterImage ?? '',
    slug: series?.slug ?? show.key,
    title: show.title,
    totalMinutes: minutes(show),
    year: show.year,
  };
};

const hours = (value: number) => `${Math.floor(value / 60)}h ${value % 60}m`;

const ranked = (
  shows: ReadonlyArray<CatalogueShow>,
  by: (show: CatalogueShow) => number,
) => [...shows].sort((a, b) => by(b) - by(a));

/** Next best shows per slot, like the API's `chooseStartBackups` (Trending draws five) */
const BACKUPS = 5;

/**
 * The pool a Where to start query names: a genre or theme landing's shows
 * (its slug, the landing's own filter) or a country's
 */
const startPool = (query: URLSearchParams) => {
  const genre = query.get('genre');
  const theme = query.get('theme');
  const country = query.get('country');
  const filter = genre
    ? landingFilter('genre', genre)
    : theme
      ? landingFilter('theme', theme)
      : country
        ? landingFilter('country', country)
        : undefined;
  return filter
    ? matching(new URLSearchParams(filter)).map((entry) => entry.show)
    : undefined;
};

const whereToStart = (query: URLSearchParams): WhereToStart | undefined => {
  const genre = query.get('genre');
  const theme = query.get('theme');
  const country = query.get('country')?.toUpperCase();
  const pool = startPool(query);
  if (!pool) {
    return undefined;
  }
  const finished = pool.filter(ended);
  // like the API: a slot takes the best candidate no earlier slot took
  const slots: ReadonlyArray<
    readonly [WhereToStartPick['kind'], ReadonlyArray<CatalogueShow>]
  > = [
    country
      ? ['favourite', ranked(pool, (show) => show.votesK)]
      : [
          'night',
          ranked(
            finished.filter((show) => minutes(show) <= 300),
            (show) => show.vote,
          ),
        ],
    [
      'weekend',
      ranked(
        finished.filter((show) => minutes(show) > 300 && minutes(show) <= 600),
        (show) => show.vote,
      ),
    ],
    [
      'long-haul',
      ranked(
        pool.filter((show) => show.seasons >= 5),
        (show) => show.votesK,
      ),
    ],
  ];
  const taken = new Set<CatalogueShow>();
  const picks = slots.flatMap(([kind, candidates]) => {
    const found = candidates.find((show) => !taken.has(show));
    if (!found) {
      return [];
    }
    taken.add(found);
    return [[kind, found] as const];
  });
  const picked = new Set(picks.map(([kind]) => kind));
  const backups = slots
    .filter(([kind]) => picked.has(kind))
    .flatMap(([kind, candidates]) =>
      candidates
        .filter((show) => !taken.has(show))
        .slice(0, BACKUPS)
        .map((show) => {
          taken.add(show);
          return [kind, show] as const;
        }),
    );
  const toPick = ([kind, show]: readonly [
    WhereToStartPick['kind'],
    CatalogueShow,
  ]) => ({
    kind,
    show: toDurationShow(show),
    why: `${show.episodes} episodes, ${hours(minutes(show))} in all`,
  });
  return {
    ...(genre ? { genre } : {}),
    ...(theme ? { theme } : {}),
    ...(country ? { country } : {}),
    backups: backups.map(toPick),
    picks: picks.map(toPick),
  };
};

export const routes: ReadonlyArray<StubRoute> = [
  {
    handle: ({ params, query }) => {
      const table = KNOWN_COUNTS[params.type ?? ''] ?? {};
      const slugs = (query.get('slugs') ?? '').split(',').filter(Boolean);
      const body: LandingCounts = {
        counts: Object.fromEntries(
          slugs.map((slug) => [slug, table[slug] ?? 120 + slug.length * 37]),
        ),
      };
      return { body };
    },
    path: '/discover/landing/:type/counts',
  },
  {
    handle: ({ query }) => {
      const ids = (query.get('ids') ?? '').split(',').filter(Boolean);
      const body: SeriesSummaries = Object.fromEntries(
        ids.map((id) => {
          const entry = byId(Number(id));
          return [
            id,
            entry
              ? {
                  genreIds: entry.show.genres,
                  id: entry.series.id,
                  lastAirYear: Number(entry.series.lastAirDate.slice(0, 4)),
                  networks: [
                    {
                      id: networkId(entry.show.network),
                      name: entry.show.network,
                    },
                  ],
                  numberOfEpisodes: entry.show.episodes,
                  numberOfSeasons: entry.show.seasons,
                  status: entry.series.status,
                  totalMinutes: minutes(entry.show),
                  year: entry.show.year,
                }
              : null,
          ];
        }),
      );
      return { body };
    },
    path: '/series/summaries',
  },
  {
    handle: ({ query }) => {
      const body = whereToStart(query);
      return body
        ? { body }
        : { body: { message: 'Bad Request' }, status: 400 };
    },
    path: '/duration/where-to-start',
  },
];
