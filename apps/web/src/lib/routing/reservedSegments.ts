/**
 * First URL segments that belong to a route of their own. Any other
 * non-numeric first segment can never be a show (`/[id]`), so it is rewritten
 * to an unmatched path and served as the static, prerendered 404: no function
 * runs for `/foo` or `/tv/abc`.
 *
 * A test fails when a top-level route in `src/app` is missing here, so adding
 * a route means adding its segment.
 */
export const RESERVED_SEGMENTS = [
  // route handlers, plus rewrite-only URLs such as the Plex scrobble webhook
  'api',
  'country',
  'decade',
  'dev',
  'discover',
  'genre',
  'language',
  'network',
  'person',
  // the privacy page
  'privacy',
  'settings',
  // the auth callback's “Sign-in broke” page
  'sign-in',
  'theme',
  'u',
] as const;

const reserved = RESERVED_SEGMENTS.join('|');

/**
 * Matches a first segment that is not all digits, not reserved, has no dot
 * (files like `robots.txt`) and doesn't start with `_` (Next internals).
 */
export const NOT_FOUND_REWRITE = {
  destination: '/_not-found',
  source: `/:first((?!(?:\\d+|${reserved})(?:/|$))[^/._][^/.]*)/:rest*`,
} as const;

/**
 * What each reserved segment's own routes serve below it: the paths, or
 * `slug` for one segment of any name (a landing; `LANDING_NOT_FOUND_REWRITES`
 * checks the name). Anything else under the segment would fall through to
 * the show route (`/settings/services` as show "settings"), which serves its
 * skeleton until it 404s. `person`, `u` and `api` route every depth
 * themselves. A test checks this against the pages in `src/app`.
 */
const OWN_SUBPATHS: Readonly<Record<string, ReadonlyArray<string> | 'slug'>> = {
  country: 'slug',
  decade: 'slug',
  dev: ['home', 'style-guide'],
  discover: [],
  genre: 'slug',
  language: 'slug',
  network: 'slug',
  privacy: [],
  settings: ['profile', 'streaming-services', 'plex', 'import', 'data'],
  'sign-in': ['error'],
  theme: 'slug',
};

export const RESERVED_SUBPATH_NOT_FOUND_REWRITES = Object.entries(
  OWN_SUBPATHS,
).map(([segment, own]) => ({
  destination: '/_not-found',
  source:
    own === 'slug'
      ? `/${segment}/:slug/:rest+`
      : own.length === 0
        ? `/${segment}/:rest+`
        : `/${segment}/:rest((?!(?:${own.join('|')})$).+)`,
}));

/**
 * A person id that is not all digits (`/person/abc`) can never exist: the
 * static 404 with no function run, as for a show.
 */
export const PERSON_NOT_FOUND_REWRITE = {
  destination: '/_not-found',
  source: '/person/:id((?!\\d+(?:/|$))[^/]+)/:rest*',
} as const;

/**
 * TMDB ids are below 10^8, so a show or person id of nine or more digits
 * (`/99999999999`, `/person/123456789/x`) can never exist: the static 404,
 * instead of a function, the API's 404 and a cached 404 entry per id. A
 * leading zero is left to the show page's canonical redirect.
 */
export const LONG_ID_NOT_FOUND_REWRITES = [
  { destination: '/_not-found', source: '/:id([1-9]\\d{8,})/:rest*' },
  {
    destination: '/_not-found',
    source: '/person/:id([1-9]\\d{8,})/:rest*',
  },
] as const;
