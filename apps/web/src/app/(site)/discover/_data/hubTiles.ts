import type { DurationBucket } from '@tvseri.es/schemas';

/**
 * The hub's hand-picked lens tiles: which countries,
 * languages, networks, themes and decades get a tile, which show dresses
 * each one (TMDB id and image paths, stored here) and the hand-written
 * lines. Counts come from the API. Edit the lists here; nothing else
 * depends on their wording.
 */

export const LENS_KEYS = [
  'duration',
  'decade',
  'country',
  'language',
  'network',
  'theme',
] as const;

export type LensKey = (typeof LENS_KEYS)[number];

export const LENS_LABELS: Readonly<Record<LensKey, string>> = {
  country: 'Country',
  decade: 'Decade',
  duration: 'Duration',
  language: 'Language',
  network: 'Network',
  theme: 'Theme',
};

/** A hand-picked show's TMDB id and image paths (`/abc.jpg`) */
export type DressShow = Readonly<{
  id: number;
  poster: string;
  backdrop: string;
}>;

/** How a tile is dressed: one backdrop, a fanned deck of three posters, or a calm icon tile */
export type TileDress =
  | Readonly<{ kind: 'backdrop'; show: DressShow; position?: string }>
  | Readonly<{
      kind: 'deck';
      shows: readonly [DressShow, DressShow, DressShow];
    }>
  | Readonly<{ kind: 'calm' }>;

/** Where a tile's "7,240 shows" comes from */
export type CountSource =
  | Readonly<{
      type: 'country' | 'language' | 'network' | 'theme';
      slug: string;
    }>
  /** a discover query string, for a tile no single landing counts */
  | Readonly<{ query: string }>;

export type LinkTileEntry = Readonly<{
  name: string;
  href: string;
  dress: TileDress;
  /** the meta line; without one the tile shows its count */
  line?: string;
  count?: CountSource;
}>;

/**
 * The shows that dress the tiles: TMDB id, poster and backdrop paths (TMDB's
 * main images, read once from themoviedb.org), so the grid needs no API read
 * for decoration. A path TMDB later replaces still serves the old image.
 */
const SHOW = {
  blackMirror: {
    backdrop: '/dg3OindVAGZBjlT3xYKqIAdukPL.jpg',
    id: 42009,
    poster: '/seN6rRfN0I6n8iDXjlSMk1QjNcq.jpg',
  },
  chernobyl: {
    backdrop: '/900tHlUYUkp7Ol04XFSoAaEIXcT.jpg',
    id: 87108,
    poster: '/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg',
  },
  dark: {
    backdrop: '/3jDXL4Xvj3AzDOF6UH1xeyHW8MH.jpg',
    id: 70523,
    poster: '/wiiyc3m6HKaQhFBYeuM7ySCNQsG.jpg',
  },
  elevenTwentyTwo: {
    backdrop: '/qVBExiGdG8uiPK9BcWD0881u8uh.jpg',
    id: 64464,
    poster: '/1fH41ccMKvgDTbbcCxWWH6fznah.jpg',
  },
  fleabag: {
    backdrop: '/hXdQ4MWsEOX6qg6VydKrLb3YJ4g.jpg',
    id: 67070,
    poster: '/vFn0nLPcIggPH5LTWWaJ2hcsGlc.jpg',
  },
  lineOfDuty: {
    backdrop: '/5ZLEFPayOJr3KhXPoAnLWdVQJem.jpg',
    id: 43982,
    poster: '/pBAp7VfKVQKQIiLRJHZSMGtyXAB.jpg',
  },
  mare: {
    backdrop: '/7X1IGIl1JMJ9YFzJymCVoqZbvTR.jpg',
    id: 115004,
    poster: '/78aK4Msbr22A5PGa6PZV0pAvdwf.jpg',
  },
  mocroMaffia: {
    backdrop: '/52YPN3cHpj5cgCCJrsO1bckoUK5.jpg',
    id: 83062,
    poster: '/iM6tRt7VQ6p6yqnpBkwb8zZmprC.jpg',
  },
  moneyHeist: {
    backdrop: '/xGexTKCJDkl12dTW4YCBDXWb1AD.jpg',
    id: 71446,
    poster: '/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg',
  },
  narcos: {
    backdrop: '/y9ekzkPFmWSqUU3Kj0wHmYUM8qu.jpg',
    id: 63351,
    poster: '/rTmal9fDbwh5F0waol2hq35U4ah.jpg',
  },
  nightManager: {
    backdrop: '/2vAOdruqvx9GojXxKi3xVsZZvKU.jpg',
    id: 61859,
    poster: '/1MccRnw41qQjREuZkovqP2UX1i3.jpg',
  },
  onePiece: {
    backdrop: '/2rmK7mnchw9Xr3XdiTFSxTTLXqv.jpg',
    id: 37854,
    poster: '/dB4EDhre2dsC2kxYDavyKWqLQwi.jpg',
  },
  peakyBlinders: {
    backdrop: '/dzq83RHwQcnP6WGJ6YkenIqeaa5.jpg',
    id: 60574,
    poster: '/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg',
  },
  pluribus: {
    backdrop: '/ulm1ex4JFYJByyaPyqTr47MFyEQ.jpg',
    id: 225171,
    poster: '/z7Nga7Q9IGFWs5OEduY2gGFxnX3.jpg',
  },
  sherlock: {
    backdrop: '/8rvLEmdI4gLrMO1rLqbNdnNcPFE.jpg',
    id: 19885,
    poster: '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg',
  },
  sopranos: {
    backdrop: '/lNpkvX2s8LGB0mjGODMT4o6Up7j.jpg',
    id: 1398,
    poster: '/rTc7ZXdroqjkKivFPvCPX0Ru7uw.jpg',
  },
  theBridge: {
    backdrop: '/7nX2uLLaVnFUR6azLDXQsjQBQvI.jpg',
    id: 45016,
    poster: '/v8V9hLWArWhoIdmZ1ujmWrJZL6J.jpg',
  },
  theWire: {
    backdrop: '/aQTtua5pG490fMfeKgtYg5B853e.jpg',
    id: 1438,
    poster: '/4lbclFySvugI51fwsyxBTOm4DqK.jpg',
  },
  travelers: {
    backdrop: '/yUDJ1r0UQdhb904povev5apjTVh.jpg',
    id: 67683,
    poster: '/aUVeyeyTrQrSFuUkqLCT8FtV7pp.jpg',
  },
  twelveMonkeys: {
    backdrop: '/oReDAVfMTBi1J543aKg7LpeecPv.jpg',
    id: 60948,
    poster: '/w5u1PqBYfDyfrlkxADTA38jYG3I.jpg',
  },
} as const satisfies Readonly<Record<string, DressShow>>;

export const COUNTRY_TILES: ReadonlyArray<LinkTileEntry> = [
  {
    count: { slug: 'gb', type: 'country' },
    dress: { kind: 'backdrop', position: 'center 25%', show: SHOW.sherlock },
    href: '/country/gb',
    name: 'United Kingdom',
  },
  {
    count: { slug: 'de', type: 'country' },
    dress: { kind: 'backdrop', show: SHOW.dark },
    href: '/country/de',
    name: 'Germany',
  },
  {
    count: { slug: 'es', type: 'country' },
    dress: {
      kind: 'backdrop',
      position: 'center 30%',
      show: SHOW.moneyHeist,
    },
    href: '/country/es',
    name: 'Spain',
  },
  {
    // One tile for both, as the design draws it; it opens Denmark's landing
    // and counts shows made in either (TMDB's `DK|SE` is "or").
    count: { query: 'with_origin_country=DK|SE' },
    dress: { kind: 'backdrop', position: 'center 30%', show: SHOW.theBridge },
    href: '/country/dk',
    name: 'Denmark and Sweden',
  },
  {
    dress: { kind: 'calm' },
    href: '/country',
    // DRAFT: owner approves
    line: 'By where a series is made',
    name: 'All 60 countries',
  },
];

export const LANGUAGE_TILES: ReadonlyArray<LinkTileEntry> = [
  {
    count: { slug: 'ja', type: 'language' },
    dress: { kind: 'backdrop', position: 'center 30%', show: SHOW.onePiece },
    href: '/language/ja',
    name: 'Japanese',
  },
  {
    count: { slug: 'es', type: 'language' },
    dress: {
      kind: 'backdrop',
      position: 'center 30%',
      show: SHOW.moneyHeist,
    },
    href: '/language/es',
    name: 'Spanish',
  },
  {
    count: { slug: 'nl', type: 'language' },
    dress: {
      kind: 'backdrop',
      position: 'center 30%',
      show: SHOW.mocroMaffia,
    },
    href: '/language/nl',
    name: 'Dutch',
  },
  {
    count: { slug: 'de', type: 'language' },
    dress: { kind: 'backdrop', show: SHOW.dark },
    href: '/language/de',
    name: 'German',
  },
  {
    dress: { kind: 'calm' },
    href: '/language',
    // DRAFT: owner approves
    line: 'By the language it was made in',
    name: 'All languages',
  },
];

export const NETWORK_TILES: ReadonlyArray<LinkTileEntry> = [
  {
    count: { slug: 'apple-tv', type: 'network' },
    dress: { kind: 'backdrop', position: 'center 25%', show: SHOW.pluribus },
    href: '/network/apple-tv',
    name: 'Apple TV',
  },
  {
    count: { slug: 'hbo', type: 'network' },
    dress: { kind: 'backdrop', position: 'center 30%', show: SHOW.mare },
    href: '/network/hbo',
    name: 'HBO',
  },
  {
    count: { slug: 'netflix', type: 'network' },
    dress: { kind: 'backdrop', position: 'center 30%', show: SHOW.narcos },
    href: '/network/netflix',
    name: 'Netflix',
  },
  {
    count: { slug: 'bbc-one', type: 'network' },
    dress: {
      kind: 'deck',
      shows: [SHOW.fleabag, SHOW.nightManager, SHOW.lineOfDuty],
    },
    href: '/network/bbc-one',
    name: 'BBC One',
  },
  {
    dress: { kind: 'calm' },
    href: '/network',
    // DRAFT: owner approves
    line: 'From AMC to ZDF',
    name: 'All networks',
  },
];

export const THEME_TILES: ReadonlyArray<LinkTileEntry> = [
  {
    count: { slug: 'dystopia', type: 'theme' },
    dress: {
      kind: 'backdrop',
      position: 'center 30%',
      show: SHOW.blackMirror,
    },
    href: '/theme/dystopia',
    name: 'Dystopia',
  },
  {
    count: { slug: 'time-travel', type: 'theme' },
    dress: {
      kind: 'deck',
      shows: [SHOW.elevenTwentyTwo, SHOW.twelveMonkeys, SHOW.travelers],
    },
    href: '/theme/time-travel',
    name: 'Time travel',
  },
  {
    count: { slug: 'detectives', type: 'theme' },
    dress: { kind: 'backdrop', position: 'center 25%', show: SHOW.sherlock },
    href: '/theme/detectives',
    name: 'Detectives',
  },
  {
    count: { slug: 'set-in-the-1980s', type: 'theme' },
    dress: { kind: 'backdrop', show: SHOW.chernobyl },
    href: '/theme/set-in-the-1980s',
    name: 'Set in the 1980s',
  },
  {
    count: { slug: 'organised-crime', type: 'theme' },
    dress: { kind: 'backdrop', position: 'center 30%', show: SHOW.narcos },
    href: '/theme/organised-crime',
    name: 'Organised crime',
  },
];

export type DecadeTileEntry = Readonly<{
  name: string;
  /** the decade's landing slug; none for "Before 1990" */
  slug: string | null;
  dress: TileDress;
  /** without one the tile shows its count */
  line?: string;
  /** the discover filter of its in-place row */
  filter: Readonly<Record<string, string>>;
}>;

/** Decades open in place; their row's title links to the decade's landing */
export const DECADE_TILES: ReadonlyArray<DecadeTileEntry> = [
  {
    dress: { kind: 'backdrop', position: 'center 25%', show: SHOW.pluribus },
    filter: {
      'first_air_date.gte': '2020-01-01',
      'first_air_date.lte': '2029-12-31',
    },
    // DRAFT: owner approves
    line: 'This decade',
    name: '2020s',
    slug: '2020s',
  },
  {
    dress: {
      kind: 'backdrop',
      position: 'center 25%',
      show: SHOW.peakyBlinders,
    },
    filter: {
      'first_air_date.gte': '2010-01-01',
      'first_air_date.lte': '2019-12-31',
    },
    // DRAFT: owner approves
    line: 'Peak TV',
    name: '2010s',
    slug: '2010s',
  },
  {
    dress: { kind: 'backdrop', position: 'center 30%', show: SHOW.theWire },
    filter: {
      'first_air_date.gte': '2000-01-01',
      'first_air_date.lte': '2009-12-31',
    },
    // DRAFT: owner approves
    line: 'The HBO decade',
    name: '2000s',
    slug: '2000s',
  },
  {
    dress: { kind: 'backdrop', position: 'center 30%', show: SHOW.sopranos },
    filter: {
      'first_air_date.gte': '1990-01-01',
      'first_air_date.lte': '1999-12-31',
    },
    // DRAFT: owner approves
    line: 'Where it started',
    name: '1990s',
    slug: '1990s',
  },
  {
    dress: { kind: 'calm' },
    filter: { 'first_air_date.lte': '1989-12-31' },
    name: 'Before 1990',
    slug: null,
  },
];

/** The decade landings "Before 1990" adds up for its count */
export const DECADES_BEFORE_1990 = [
  '1940s',
  '1950s',
  '1960s',
  '1970s',
  '1980s',
] as const;

export type DurationTileEntry = Readonly<{
  name: string;
  dress: 'backdrop' | 'deck';
  /** without one the tile shows its count as "1,104 miniseries" */
  line?: string;
  position?: string;
}>;

export const DURATION_TILES: Readonly<
  Record<DurationBucket, DurationTileEntry>
> = {
  'complete-stories': {
    dress: 'deck',
    // DRAFT: owner approves
    line: 'Ended series',
    name: 'Complete stories',
  },
  'long-haul': {
    dress: 'backdrop',
    // DRAFT: owner approves
    line: '5+ seasons',
    name: 'The long haul',
    position: 'center 25%',
  },
  'one-season': {
    dress: 'deck',
    // DRAFT: owner approves
    line: 'About 10 episodes',
    name: 'One season',
  },
  'one-weekend': {
    dress: 'deck',
    // DRAFT: owner approves
    line: '6 to 10 hours',
    name: 'One weekend',
  },
  'under-6-hours': { dress: 'backdrop', name: 'Under 6 hours' },
};

/** The Genres block, in the design's order, then the genres TMDB only has as a keyword */
export const GENRE_TILES = [
  { name: 'Drama', slug: 'drama' },
  { name: 'Crime', slug: 'crime' },
  { name: 'Comedy', slug: 'comedy' },
  { name: 'Mystery', slug: 'mystery' },
  { name: 'Sci-Fi & Fantasy', slug: 'sci-fi-fantasy' },
  { name: 'Action & Adventure', slug: 'action-adventure' },
  { name: 'War & Politics', slug: 'war-politics' },
  { name: 'Documentary', slug: 'documentary' },
  { name: 'Animation', slug: 'animation' },
  { name: 'Family', slug: 'family' },
  { name: 'Western', slug: 'western' },
  { name: 'Reality', slug: 'reality' },
  { name: 'Horror', slug: 'horror' },
  { name: 'Thriller', slug: 'thriller' },
  { name: 'Romance', slug: 'romance' },
] as const;

/** The decade rows: best rated with a vote floor (0.3k) */
export const TOP_RATED_FILTER = {
  sort_by: 'vote_average.desc',
  'vote_count.gte': '300',
} as const;

/**
 * Shows per hub row. Every row is in
 * the page already (tabs and tiles swap on the client), so each is kept short.
 */
export const ROW_LENGTH = 12;
