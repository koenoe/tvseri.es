import type { TvSeries } from '@tvseri.es/schemas';

import {
  CATALOGUE,
  type CatalogueShow,
  catalogueId,
  seasonSizes,
} from './catalogue.ts';

/**
 * Shared helpers for stub fixtures: the catalogue as API `TvSeries`, and
 * placeholder images served by the stub itself (`/img/...`), so pages render
 * offline. The TMDB image loader leaves non-TMDB URLs unchanged.
 */

const STUB_URL =
  process.env.STUB_API_URL ??
  `http://localhost:${process.env.STUB_API_PORT ?? 3190}`;

export type ImageKind = 'backdrop' | 'logo' | 'logo-block' | 'poster' | 'still';

export const imageUrl = (kind: ImageKind, label: string) =>
  `${STUB_URL}/img/${kind}/${encodeURIComponent(label)}.svg`;

/** TMDB ids of the networks the fixtures name; others get a stable made-up id. */
export const NETWORK_IDS: Readonly<Record<string, number>> = {
  ABC: 2,
  AMC: 174,
  'Antena 3': 400,
  'Apple TV': 2552,
  'BBC America': 493,
  'BBC One': 4,
  'BBC Three': 3,
  'BBC Two': 332,
  CBS: 16,
  'Channel 4': 26,
  Cinemax: 359,
  'Disney+': 2739,
  DR1: 119,
  FOX: 19,
  'Fuji TV': 1,
  FX: 88,
  HBO: 49,
  Hulu: 453,
  ITV: 9,
  ITV1: 9,
  JTBC: 885,
  MBS: 94,
  NBC: 6,
  Netflix: 213,
  'Nippon TV': 57,
  'Paramount+': 4330,
  'Prime Video': 1024,
  Showtime: 67,
  Starz: 318,
  SVT: 87,
  Syfy: 77,
  TBS: 160,
  'TV 2': 245,
  'TV Tokyo': 98,
  tvN: 866,
  Videoland: 1310,
};

const hash = (value: string) =>
  [...value].reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) % 9973,
    7,
  );

export const networkId = (name: string) =>
  NETWORK_IDS[name] ?? 90_000 + hash(name);

/** Stable ids: Breaking Bad keeps its real TMDB id (1396). */
export const showId = (show: CatalogueShow) => catalogueId(show);

export const slugOf = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-');

const GENRE_NAMES: Readonly<Record<number, string>> = {
  16: 'Animation',
  18: 'Drama',
  35: 'Comedy',
  37: 'Western',
  80: 'Crime',
  99: 'Documentary',
  9648: 'Mystery',
  10751: 'Family',
  10759: 'Action & Adventure',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
};

const ENDED_BEFORE = 2025;

/**
 * Dated season premieres: the show's next episode, so a page can say
 * "Returning Tue 17 Nov".
 */
const NEXT_PREMIERES: Readonly<Record<string, readonly [string, number]>> = {
  pluribus: ['2026-11-20', 2],
  silo: ['2027-03-05', 3],
  tlou: ['2027-04-12', 3],
  whitelotus: ['2026-11-17', 4],
};

const nextEpisode = (show: CatalogueShow) => {
  const premiere = NEXT_PREMIERES[show.key];
  if (!premiere) {
    return undefined;
  }
  const [airDate, seasonNumber] = premiere;
  return {
    airDate,
    description: '',
    episodeNumber: 1,
    hasAired: false,
    id: showId(show) * 100 + seasonNumber,
    runtime: show.runtime,
    seasonNumber,
    stillImage: '',
    stillPath: '',
    title: `Season ${seasonNumber}, episode 1`,
  };
};

/**
 * The shows in "New in crime", dated a few weeks back from today so a
 * "first aired in the last 12 months" window finds them whenever the stub
 * runs.
 */
const RECENT: ReadonlyArray<string> = [
  'blackrabbit',
  'task',
  'thousand',
  'eric',
  'mobland',
  'deptq',
];

const DAY = 24 * 60 * 60 * 1000;

const firstAirDate = (show: CatalogueShow) => {
  const recent = RECENT.indexOf(show.key);
  return recent === -1
    ? `${show.year}-01-15`
    : new Date(Date.now() - (20 + recent * 9) * DAY).toISOString().slice(0, 10);
};

/**
 * A backdrop colour of the show's own, from its key (the API's dominant
 * colour stands in): every show has a different one, the same each run, so
 * landings led by different shows stand on different grounds.
 */
const backdropColor = (key: string) => {
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  const chroma = 0.45 * 0.6;
  const x = chroma * (1 - Math.abs(((hash / 60) % 2) - 1));
  const m = 0.3 - chroma / 2;
  const sector = Math.floor(hash / 60);
  const [r = 0, g = 0, b = 0] = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][sector] ?? [0, 0, 0];
  return `#${[r, g, b]
    .map((part) =>
      Math.round((part + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
};

export const toTvSeries = (show: CatalogueShow): TvSeries => {
  const id = showId(show);
  const ended = show.ended ?? show.year + show.seasons < ENDED_BEFORE;
  return {
    backdropColor: backdropColor(show.key),
    backdropImage: imageUrl('backdrop', show.title),
    backdropPath: `/${show.key}-backdrop.svg`,
    countries: [{ code: show.country, name: show.country }],
    createdBy: [],
    description: `${show.title}: a stub description of the show.`,
    firstAirDate: firstAirDate(show),
    genres: show.genres.map((genre) => ({
      id: genre,
      name: GENRE_NAMES[genre] ?? 'Drama',
      slug: slugOf(GENRE_NAMES[genre] ?? 'Drama'),
    })),
    hasAired: true,
    id,
    isAdult: false,
    languages: [],
    lastAirDate: `${ended ? show.year + show.seasons : 2025}-06-01`,
    ...(nextEpisode(show) ? { nextEpisodeToAir: nextEpisode(show) } : {}),
    network: {
      id: networkId(show.network),
      logo: imageUrl('logo', show.network),
      name: show.network,
    },
    numberOfAiredEpisodes: show.episodes,
    numberOfEpisodes: show.episodes,
    numberOfSeasons: show.seasons,
    originalLanguage: show.language,
    originalTitle: show.originalTitle,
    originCountry: { code: show.country, name: show.country },
    popularity: show.votesK * 10,
    posterImage: imageUrl('poster', show.title),
    posterPath: `/${show.key}-poster.svg`,
    releaseYear: String(show.year),
    // counts, like TMDB: the marking core needs them to mark a show
    seasons: seasonSizes(show).map((size, index) => ({
      airDate: `${firstAirDate(show)}T00:00:00.000Z`,
      description: '',
      episodes: [],
      hasAired: true,
      id: id * 100 + index + 1,
      numberOfAiredEpisodes: size,
      numberOfEpisodes: size,
      seasonNumber: index + 1,
      title: `Season ${index + 1}`,
    })),
    slug: slugOf(show.title),
    status: ended ? 'Ended' : 'Returning Series',
    tagline: '',
    title: show.title,
    // every catalogue show has a title treatment, so spotlights can use it
    titleTreatmentImage: imageUrl('logo', show.title),
    type: show.seasons === 1 && ended ? 'Miniseries' : 'Scripted',
    voteAverage: show.vote / 10,
    voteCount: Math.round(show.votesK * 1000),
  };
};

export const SHOWS = CATALOGUE.map((show) => ({
  series: toTvSeries(show),
  show,
}));

export const byKey = (key: string) => {
  const found = SHOWS.find((entry) => entry.show.key === key);
  if (!found) {
    throw new Error(`stub catalogue has no show "${key}"`);
  }
  return found.series;
};

export const byId = (id: number) =>
  SHOWS.find((entry) => entry.series.id === id);
