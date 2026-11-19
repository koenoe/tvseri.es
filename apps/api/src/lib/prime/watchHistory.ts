import { primeTitle } from '@tvseri.es/import';
import * as v from 'valibot';

import { getJson, getText, readFailure } from '@/lib/connections/http';
import type { CookieJar } from '@/lib/connections/jar';
import type { ReadFailure } from '@/lib/connections/reader';

/**
 * Read the way Prime Video's settings page scrolls it:
 * `getWatchHistorySettingsPage` answers JSON when asked (the only header it
 * needs), grouped by day, with an opaque `nextToken`.
 */

const ORIGIN = 'https://www.primevideo.com';
export const SITE = 'primevideo.com';

/** One played title: a season (its episodes in `children`), a film, or a stray episode */
export type PrimeEntry = Readonly<{
  children: ReadonlyArray<unknown>;
  gti: string;
  /** `/detail/<id>…`, when Prime Video links the title */
  href: string | null;
  text: string;
  /** Epoch ms */
  time: number;
  titleType: string;
}>;

const EntrySchema = v.object({
  children: v.fallback(v.array(v.unknown()), []),
  gti: v.pipe(v.string(), v.minLength(1)),
  time: v.number(),
  title: v.object({
    href: v.fallback(v.nullable(v.string()), null),
    text: v.string(),
  }),
  titleType: v.string(),
});

export const parseEntry = (raw: unknown): PrimeEntry | null => {
  const parsed = v.safeParse(EntrySchema, raw);
  if (!parsed.success) {
    return null;
  }
  const { children, gti, time, title, titleType } = parsed.output;
  return { children, gti, href: title.href, text: title.text, time, titleType };
};

const HistoryContentSchema = v.object({
  nextToken: v.fallback(v.nullable(v.string()), null),
  titles: v.array(v.object({ titles: v.fallback(v.array(v.unknown()), []) })),
});

const WidgetsSchema = v.object({ widgets: v.array(v.unknown()) });
const WidgetSchema = v.object({
  content: v.object({ content: HistoryContentSchema }),
});

export type HistoryAnswer = Readonly<{
  /** Unparsed: each is read with `parseEntry` */
  entries: ReadonlyArray<unknown>;
  nextToken: string | null;
  profileName: string | null;
}>;

/** How many levels `findValue` looks into an answer */
const MAX_DEPTH = 12;

const findValue = <T>(
  value: unknown,
  key: string,
  accept: (found: unknown) => found is T,
  depth = 0,
): T | null => {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') {
    return null;
  }
  if (!Array.isArray(value) && key in value) {
    const found = (value as Record<string, unknown>)[key];
    if (accept(found)) {
      return found;
    }
  }
  for (const child of Object.values(value)) {
    const found = findValue(child, key, accept, depth + 1);
    if (found !== null) {
      return found;
    }
  }
  return null;
};

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';
const isTrue = (value: unknown): value is true => value === true;
const hasName = (value: unknown): value is Readonly<{ name: string }> =>
  typeof value === 'object' &&
  value !== null &&
  isText((value as Record<string, unknown>).name);

/** Amazon's sign-in form: a page that only links to sign-in isn't one */
const SIGN_IN_FORM = /name="signIn"/i;

/**
 * A 200 that isn't JSON: Amazon's bot check (try later), its sign-in form,
 * or something else
 */
const notJson = (text: string): ReadFailure => {
  if (/robot check|captcha/i.test(text)) {
    return readFailure('unavailable');
  }
  if (SIGN_IN_FORM.test(text)) {
    return readFailure('signed-out');
  }
  return readFailure('changed');
};

const isOn = (location: URL, site: RegExp) =>
  location.protocol === 'https:' && site.test(location.hostname);
const PRIME_HOST = /(?:^|\.)primevideo\.com$/i;
/** Amazon's own hosts, where its sign-in lives (amazon.com, amazon.co.uk…) */
const AMAZON_HOST =
  /(?:^|\.)amazon\.(?:[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/i;

/** Amazon's sign-in is signed out; off Prime Video is `changed`, the jar never sent there */
const redirect = (location: URL): 'follow' | ReadFailure => {
  const own = isOn(location, PRIME_HOST);
  if (
    (own || isOn(location, AMAZON_HOST)) &&
    /\/ap\/signin\b/i.test(location.pathname)
  ) {
    return readFailure('signed-out');
  }
  return own ? 'follow' : readFailure('changed');
};

const get = (
  url: string,
  jar: CookieJar,
  options: Readonly<{ authStatus?: boolean }> = {},
) => getJson(url, {}, { ...options, jar, notJson, redirect });

export const readHistoryPage = async (
  jar: CookieJar,
  nextToken: string | null,
): Promise<Readonly<{ ok: true; answer: HistoryAnswer }> | ReadFailure> => {
  const query = nextToken
    ? `?widgetArgs=${encodeURIComponent(JSON.stringify({ nextToken }))}`
    : '';
  const read = await get(
    `${ORIGIN}/api/getWatchHistorySettingsPage${query}`,
    jar,
  );
  if (!read.ok) {
    return read;
  }
  const widgets = v.safeParse(WidgetsSchema, read.body);
  const history = widgets.success
    ? widgets.output.widgets
        .map((widget) => v.safeParse(WidgetSchema, widget))
        .find((widget) => widget.success)?.output.content.content
    : undefined;
  if (!history) {
    // Amazon's bot scoring can answer JSON too
    return findValue(read.body, 'isRobotic', isTrue)
      ? readFailure('unavailable')
      : readFailure('changed');
  }
  return {
    answer: {
      entries: history.titles.flatMap((day) => day.titles),
      nextToken: history.nextToken,
      profileName:
        findValue(read.body, 'activeProfile', hasName)?.name.trim() ?? null,
    },
    ok: true,
  };
};

type ShowSeason = Readonly<{
  /** A split season's part ("Season 5 - Part 2"), when known */
  part?: number;
  season: number;
  show: string;
}>;

/**
 * A split season's number on its detail page: 502 for season 5, part 2.
 * No show has a hundredth season, so three digits are always this.
 */
const splitSeason = (season: number) =>
  season >= 100
    ? { part: season % 100, season: Math.floor(season / 100) }
    : { part: 1, season };

export type SeasonDetail = Readonly<{
  pairs: ReadonlyArray<ShowSeason>;
  /**
   * How far the viewer got in each of the page's episodes (0–1, by gti), as
   * its progress bars show; an episode never played has none
   */
  progress: ReadonlyMap<string, number>;
  seasons: ReadonlySet<number>;
  shows: ReadonlySet<string>;
}>;

const PlaybackActionsSchema = v.record(
  v.string(),
  v.object({ primaryActions: v.fallback(v.array(v.unknown()), []) }),
);
const ActionStateSchema = v.object({
  body: v.object({
    btf: v.object({
      state: v.object({ action: v.object({ btf: PlaybackActionsSchema }) }),
    }),
  }),
});
const PlaybackSchema = v.object({
  payload: v.object({
    playback: v.object({ progress: v.pipe(v.number(), v.minValue(0)) }),
  }),
});

/** Each episode's play button carries its progress (`playback.progress`) */
const progressOf = (body: unknown): ReadonlyMap<string, number> => {
  const parsed = v.safeParse(ActionStateSchema, body);
  const progress = new Map<string, number>();
  if (!parsed.success) {
    return progress;
  }
  for (const [gti, { primaryActions }] of Object.entries(
    parsed.output.body.btf.state.action.btf,
  )) {
    for (const action of primaryActions) {
      const play = v.safeParse(PlaybackSchema, action);
      if (play.success) {
        progress.set(gti, play.output.payload.playback.progress);
        break;
      }
    }
  }
  return progress;
};

const isSeasonNumber = (value: unknown): value is number | string =>
  (typeof value === 'number' && Number.isInteger(value) && value > 0) ||
  (typeof value === 'string' && /^\d+$/.test(value) && Number(value) > 0);

/** The detail page's id in a title's link, `/detail/<id>/ref=…` */
export const detailId = (href: string | null): string | null =>
  href ? (/\/detail\/([\w.-]+)/.exec(href)?.[1] ?? null) : null;

/** Every object in `value` that holds `key` (as deep as `findValue` looks) */
const objectsWith = (
  value: unknown,
  key: string,
  depth = 0,
): ReadonlyArray<Readonly<Record<string, unknown>>> => {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') {
    return [];
  }
  const own =
    !Array.isArray(value) && key in value
      ? [value as Readonly<Record<string, unknown>>]
      : [];
  return [
    ...own,
    ...Object.values(value).flatMap((child) =>
      objectsWith(child, key, depth + 1),
    ),
  ];
};

const seasonDetailOf = (body: unknown): SeasonDetail => {
  const withTitle = objectsWith(body, 'parentTitle');
  return {
    pairs: withTitle.flatMap(({ parentTitle, seasonNumber }) =>
      isText(parentTitle) && isSeasonNumber(seasonNumber)
        ? [{ season: Number(seasonNumber), show: parentTitle.trim() }]
        : [],
    ),
    progress: progressOf(body),
    seasons: new Set(
      objectsWith(body, 'seasonNumber').flatMap(({ seasonNumber }) =>
        isSeasonNumber(seasonNumber) ? [Number(seasonNumber)] : [],
      ),
    ),
    shows: new Set(
      withTitle.flatMap(({ parentTitle }) =>
        isText(parentTitle) ? [parentTitle.trim()] : [],
      ),
    ),
  };
};

const only = <T>(values: ReadonlySet<T>): T | null =>
  values.size === 1 ? ([...values][0] ?? null) : null;

/**
 * The page's one show-and-season pair is the season; failing that it must
 * name one show and one season in all, as a page listing related titles could
 * otherwise pair the wrong two.
 */
export const seasonFrom = (
  named: Readonly<{ season: number | null; show: string | null }>,
  detail: SeasonDetail,
): ShowSeason | null => {
  const pairs = new Map(
    detail.pairs
      .filter(({ season }) => named.season === null || season === named.season)
      .map((pair) => [`${pair.season}|${pair.show}`, pair]),
  );
  const pair = pairs.size === 1 ? [...pairs.values()][0] : undefined;
  const season = named.season ?? pair?.season ?? only(detail.seasons);
  // A detail page names the show with its version labels too
  const detailShow = pair?.show ?? only(detail.shows);
  const show =
    named.show ?? (detailShow === null ? null : primeTitle(detailShow));
  return season !== null && show !== null
    ? { ...splitSeason(season), show }
    : null;
};

/**
 * A title's page may be withheld for its own reasons (a region, a title
 * gone), so its 401/403 is `read-failed`: only Amazon's sign-in means signed out.
 */
export const readSeasonDetail = async (
  jar: CookieJar,
  id: string,
): Promise<Readonly<{ ok: true; detail: SeasonDetail }> | ReadFailure> => {
  const read = await get(`${ORIGIN}/detail/${encodeURIComponent(id)}`, jar, {
    authStatus: false,
  });
  return read.ok ? { detail: seasonDetailOf(read.body), ok: true } : read;
};

export type PrimeProfile = Readonly<{ id: string; name: string }>;

const isProfile = (value: unknown): value is PrimeProfile =>
  hasName(value) && isText((value as Record<string, unknown>).id);

/** The page's JSON blocks (`<script type="application/json">`) */
const JSON_SCRIPT =
  /<script\b[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** The history API doesn't say; the history page's HTML does, as `activeProfile` */
export const readActiveProfile = async (
  jar: CookieJar,
): Promise<
  Readonly<{ ok: true; profile: PrimeProfile | null }> | ReadFailure
> => {
  const read = await getText(
    `${ORIGIN}/settings/watch-history`,
    { accept: 'text/html' },
    { jar, redirect },
  );
  if (!read.ok) {
    return read;
  }
  // A bot check first; the signed-in page links to sign-in pages itself,
  // so only a page with no profile but the sign-in form is signed out
  if (/robot check|captcha/i.test(read.text)) {
    return readFailure('unavailable');
  }
  for (const [, block = ''] of read.text.matchAll(JSON_SCRIPT)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch {
      continue;
    }
    const profile = findValue(parsed, 'activeProfile', isProfile);
    if (profile) {
      return {
        ok: true,
        profile: { id: profile.id, name: profile.name.trim() },
      };
    }
  }
  return SIGN_IN_FORM.test(read.text)
    ? readFailure('signed-out')
    : { ok: true, profile: null };
};
