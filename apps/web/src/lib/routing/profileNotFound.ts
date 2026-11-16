// Relative: next.config.ts loads this file without the app's path aliases
import { FIRST_STATS_YEAR, nextUtcYear } from '../stats/years';

/**
 * Malformed profile URLs get the static, prerendered 404 with no function
 * run, like `PERSON_NOT_FOUND_REWRITE`:
 *
 * - a username that can't exist: shorter than 3 or longer than 128
 *   characters, or with a character no stored username has (`/u/n!na`).
 *   Not `UsernameSchema`'s slug: that rule is for writes. A username stored
 *   before it (3 to 128 characters of anything) must still have its pages, so
 *   uppercase, `_`, `.`, `-` anywhere and percent-encoded characters (a space,
 *   an accent) all reach the page;
 * - a Stats year that isn't one with a page: 2000 to next year as of the
 *   build (`/u/nina/stats/20x5`, `/1999`, `/2031`). Each one would otherwise
 *   run a function and cache its own 404 per (user, year). Deploys are far
 *   more frequent than New Year, so the build's "next year" is the page's.
 *
 * Next and Vercel match rewrites without case, so `/u/NINA/…` passes; the
 * Stats page redirects another spelling to the canonical URL. Well-formed
 * but unknown users and years render the page's own 404 (a noindex soft 404,
 * streamed after the shell).
 */
/** What a stored username can look like in a URL: 3 to 128 characters, encoded */
export const POSSIBLE_USERNAME = '[A-Za-z0-9._~%+-]{3,128}';

export const USERNAME_NOT_FOUND_REWRITE = {
  destination: '/_not-found',
  source: `/u/:username((?!${POSSIBLE_USERNAME}(?:/|$))[^/]+)/:rest*`,
} as const;

/** The rewrite for the years from 2000 to `lastYear` */
export const statsYearNotFoundRewrite = (lastYear: number) => {
  const years = Array.from(
    { length: lastYear - FIRST_STATS_YEAR + 1 },
    (_, index) => FIRST_STATS_YEAR + index,
  ).join('|');
  return {
    destination: '/_not-found',
    source: `/u/:username/stats/:year((?!(?:${years})(?:/|$))[^/]+)/:rest*`,
  } as const;
};

export const STATS_YEAR_NOT_FOUND_REWRITE = statsYearNotFoundRewrite(
  nextUtcYear(),
);

/**
 * The Library's shelves are static folders (`library/watching`, …), so
 * anything else under `/library` is the static 404, not a function run that
 * renders Next's own: a shelf that isn't one (`/library/junk`), or anything
 * below a shelf (`/library/watching/x`). Kept in step with `LIBRARY_SHELVES`
 * by its test.
 */
const SHELVES = 'watching|watchlist|finished|favourites|all|hidden';

export const LIBRARY_NOT_FOUND_REWRITES = [
  {
    destination: '/_not-found',
    source: `/u/:username/library/:shelf((?!(?:${SHELVES})(?:/|$))[^/]+)/:rest*`,
  },
  {
    destination: '/_not-found',
    source: '/u/:username/library/:shelf/:rest+',
  },
] as const;
