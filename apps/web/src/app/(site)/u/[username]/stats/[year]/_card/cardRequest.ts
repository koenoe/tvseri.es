import { CACHE_LIFE } from '@tvseri.es/constants';

import statsPath from '@/lib/routing/statsPath';

import { parseStatsYear, type YearState } from '@/lib/stats/statsYear';
import { CARD_THEMES, type CardTheme } from './theme';

/**
 * The card route's contract (`/u/{username}/stats/{year}/card`), shared by
 * the route, the og:image and the share UI. Pure: the client imports it.
 *
 * `?format=story|square` (default square) and `?theme=dark|colour` (default
 * dark). A missing value is the default. An unknown value, any other query key and a repeated key are a
 * 400, so made-up URLs never become renders or CDN entries of their own (the
 * CDN keys on the full URL).
 */

export type CardFormat = 'story' | 'square';

const CARD_FORMATS: ReadonlyArray<CardFormat> = ['story', 'square'];

export const CARD_SIZES: Readonly<
  Record<CardFormat, Readonly<{ width: number; height: number }>>
> = {
  square: { height: 1080, width: 1080 },
  story: { height: 1920, width: 1080 },
};

type CardRequest = Readonly<{
  year: number;
  format: CardFormat;
  theme: CardTheme;
}>;

type CardRequestResult =
  | Readonly<{ ok: true; request: CardRequest }>
  | Readonly<{ ok: false; status: 400 | 404; message: string }>;

const pick = <T extends string>(
  value: string | null,
  allowed: ReadonlyArray<T>,
  fallback: T,
): T | null => {
  if (value === null || value === '') {
    return fallback;
  }
  return allowed.find((item) => item === value) ?? null;
};

const CARD_QUERY_KEYS: ReadonlySet<string> = new Set(['format', 'theme']);

const BAD_QUERY: CardRequestResult = {
  message: 'format is story or square, theme dark or colour',
  ok: false,
  status: 400,
};

/** Only `format` and `theme`, each at most once */
const isCardQuery = (query: URLSearchParams) => {
  const keys = [...query.keys()];
  return (
    keys.every((key) => CARD_QUERY_KEYS.has(key)) &&
    new Set(keys).size === keys.length
  );
};

/**
 * Reads the year and the query. A year without a Stats page is a 404, by
 * the page's own rule (`parseStatsYear`); whether it's finished is checked
 * against the clock afterwards (`cardYearMessage`).
 */
export function parseCardRequest(
  yearParam: string,
  query: URLSearchParams,
): CardRequestResult {
  const year = parseStatsYear(yearParam);
  if (year === null) {
    return { message: 'Not found', ok: false, status: 404 };
  }
  if (!isCardQuery(query)) {
    return BAD_QUERY;
  }
  const format = pick(query.get('format'), CARD_FORMATS, 'square');
  const theme = pick(query.get('theme'), CARD_THEMES, 'dark');
  if (!format || !theme) {
    return BAD_QUERY;
  }
  return { ok: true, request: { format, theme, year } };
}

/** Why a year has no card yet ("No card for 2026 so far"); null when it has */
export function cardYearMessage(year: number, state: YearState): string | null {
  if (state === 'finished') {
    return null;
  }
  return state === 'current' ? `No card for ${year} so far` : 'Not found';
}

/** The card's URL, for the share UI's previews and downloads */
export function cardPath(
  username: string,
  year: number,
  options: Readonly<{ format: CardFormat; theme: CardTheme }>,
): string {
  const query = new URLSearchParams({
    format: options.format,
    theme: options.theme,
  });
  return `${statsPath(username, year)}/card?${query}`;
}

/** The card is a JPEG: posters and gradients are photographic */
export const CARD_CONTENT_TYPE = 'image/jpeg';

/**
 * "nina-2025-square.jpg", "nina-2025-story-colour.jpg": the pattern
 * (`{username}-{year}-{format}[-colour]`), with the JPEG's extension
 */
export const cardFileName = (
  username: string,
  year: number,
  format: CardFormat,
  theme: CardTheme,
) => `${username}-${year}-${format}${theme === 'colour' ? '-colour' : ''}.jpg`;

/** The browser keeps a card for an hour, so reopening the dialog is free */
const BROWSER_MAX_AGE = 3600;

/** At most a day of serving a stale card while the CDN refetches it */
const CDN_STALE = 86_400;

/**
 * The card is the same for every viewer: the CDN keeps it a day (the
 * `stats` profile's `s-maxage`) and serves it stale for at most a day more.
 * A mark expires only the server's entry (`renderCardImage`'s tags), never
 * the CDN's copy: a changed year reaches a shared card within about two days.
 * A card drawn with a failed poster (`degraded`) gets the `unavailable`
 * profile's numbers instead, so the posters come back within minutes.
 */
export function cardCacheControl(degraded: boolean): string {
  if (degraded) {
    const { sMaxAge, staleWhileRevalidate } = CACHE_LIFE.unavailable;
    return `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
  }
  return `public, max-age=${BROWSER_MAX_AGE}, s-maxage=${CACHE_LIFE.stats.sMaxAge}, stale-while-revalidate=${CDN_STALE}`;
}
