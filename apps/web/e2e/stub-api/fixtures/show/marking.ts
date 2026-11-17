import type { SeriesPrefs, WatchedItem } from '@tvseri.es/schemas';

import {
  airedEpisodes,
  DISNEY_PROVIDER,
  episodesOf,
  MAX_EPISODES_PER_SERIES_MARK,
  type StubEpisode,
  type StubShow,
  TODAY,
} from './catalog.ts';
import { isRecord } from './http.ts';
import {
  episodeCode,
  episodeKey,
  seriesPrefs,
  seriesWatched,
  setSeriesPrefs,
  toWatchedItem,
  type UserState,
} from './store.ts';

const MIN_WATCHED_AT = Date.UTC(2000, 0, 1);
const DAY_MS = 86_400_000;

export type When = Readonly<{ dateUnknown?: true; watchedAt: number }>;
type Provider = Readonly<{ logoPath: string; name: string }> | null;

export type MarkBody = Readonly<{ provider: Provider; when: When }>;

/** A 400 message, or null when `watchedAt` is fine. */
export const checkWatchedAt = (value: unknown): string | null =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= MIN_WATCHED_AT &&
  value <= Date.now() + DAY_MS
    ? null
    : 'watchedAt must be an integer between 2000 and now + 1 day';

const toProvider = (value: unknown): Provider | undefined => {
  if (value === null) {
    return null;
  }
  if (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.id === 'number'
  ) {
    return {
      logoPath: typeof value.logoPath === 'string' ? value.logoPath : '',
      name: value.name,
    };
  }
  return undefined;
};

/** The body of the mark routes (`CreateWatchedItemSchema`), or a 400 message. */
export const parseMarkBody = (body: unknown): MarkBody | string => {
  if (!isRecord(body)) {
    return 'Expected a JSON object';
  }
  const { dateUnknown, region, watchedAt } = body;
  if (dateUnknown !== undefined && dateUnknown !== true) {
    return 'dateUnknown can only be true';
  }
  if (dateUnknown && watchedAt !== undefined) {
    return 'Use watchedAt or dateUnknown, not both';
  }
  if (watchedAt !== undefined) {
    const problem = checkWatchedAt(watchedAt);
    if (problem) {
      return problem;
    }
  }
  const provider = toProvider(body.watchProvider);
  const hasRegion = typeof region === 'string' && /^[A-Z]{2}$/.test(region);
  if (provider === undefined && !hasRegion) {
    return 'Expected watchProvider (an object or null) or a region';
  }
  const now = Date.now();
  return {
    // A region alone resolves to the show's provider there: Disney+ in the stub
    provider:
      provider === undefined
        ? { logoPath: DISNEY_PROVIDER.logoPath, name: DISNEY_PROVIDER.name }
        : provider,
    when: dateUnknown
      ? { dateUnknown: true, watchedAt: now }
      : { watchedAt: typeof watchedAt === 'number' ? watchedAt : now },
  };
};

/** Marks leave the skipped set: "a tap on a skipped episode marks it". */
export const clearSkipped = (
  state: UserState,
  seriesId: number,
  items: ReadonlyArray<Pick<WatchedItem, 'episodeNumber' | 'seasonNumber'>>,
): void => {
  const prefs = seriesPrefs(state, seriesId);
  const marked = new Set(
    items.map((item) => episodeCode(item.seasonNumber, item.episodeNumber)),
  );
  const skipped = prefs.skipped.filter((code) => !marked.has(code));
  if (skipped.length !== prefs.skipped.length) {
    setSeriesPrefs(state, seriesId, { ...prefs, skipped });
  }
};

const byEpisode = (a: WatchedItem, b: WatchedItem): number =>
  a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber;

export const watchedList = (
  state: UserState,
  seriesId: number,
  season?: number,
): WatchedItem[] =>
  [...seriesWatched(state, seriesId).values()]
    .filter((item) => season === undefined || item.seasonNumber === season)
    .sort(byEpisode);

const markEpisodes = (
  state: UserState,
  userId: string,
  show: StubShow,
  episodes: ReadonlyArray<StubEpisode>,
  { provider, when }: MarkBody,
  { overwrite }: Readonly<{ overwrite: boolean }>,
): void => {
  const store = seriesWatched(state, show.id);
  for (const episode of episodes) {
    const key = episodeKey(episode.season, episode.number);
    if (!overwrite && store.has(key)) {
      continue;
    }
    store.set(key, toWatchedItem(show, episode, userId, when, provider));
  }
  clearSkipped(
    state,
    show.id,
    episodes.map((episode) => ({
      episodeNumber: episode.number,
      seasonNumber: episode.season,
    })),
  );
};

/** One episode (any episode of a started show; re-marking re-dates it). */
export const markEpisode = (
  state: UserState,
  userId: string,
  show: StubShow,
  episode: StubEpisode,
  body: MarkBody,
): WatchedItem[] => {
  markEpisodes(state, userId, show, [episode], body, { overwrite: true });
  return [
    seriesWatched(state, show.id).get(
      episodeKey(episode.season, episode.number),
    ) as WatchedItem,
  ];
};

/** A season: its aired episodes that aren't watched yet. */
export const markSeason = (
  state: UserState,
  userId: string,
  show: StubShow,
  season: number,
  body: MarkBody,
): WatchedItem[] => {
  const aired = episodesOf(show, season).filter(
    (episode) => episode.airDate <= TODAY,
  );
  markEpisodes(state, userId, show, aired, body, { overwrite: false });
  return watchedList(state, show.id, season);
};

/** The whole show; null above the cap (the API answers 413). */
export const markShow = (
  state: UserState,
  userId: string,
  show: StubShow,
  body: MarkBody,
): WatchedItem[] | null => {
  const aired = airedEpisodes(show);
  if (aired.length > MAX_EPISODES_PER_SERIES_MARK) {
    return null;
  }
  markEpisodes(state, userId, show, aired, body, { overwrite: false });
  return watchedList(state, show.id);
};

export const unmark = (
  state: UserState,
  seriesId: number,
  scope: Readonly<{ episode?: number; season?: number }>,
): void => {
  const store = seriesWatched(state, seriesId);
  for (const [key, item] of store) {
    // The whole show keeps its specials, as the API's does
    const inSeason =
      scope.season === undefined
        ? item.seasonNumber > 0
        : item.seasonNumber === scope.season;
    const inEpisode =
      scope.episode === undefined || item.episodeNumber === scope.episode;
    if (inSeason && inEpisode) {
      store.delete(key);
    }
  }
};

// --- Per-show prefs ------------------------------------------------------

const CODE = /^S(\d{1,3})E(\d{1,4})$/i;

/** `s2e5` and `S002E005` both become `S02E05`; null when it isn't a code. */
const normaliseCode = (value: unknown): string | null => {
  const match = typeof value === 'string' ? CODE.exec(value) : null;
  return match ? episodeCode(Number(match[1]), Number(match[2])) : null;
};

const codes = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2000) {
    return null;
  }
  const normalised = value.map(normaliseCode);
  return normalised.every((code) => code !== null)
    ? (normalised as string[])
    : null;
};

const ALLOWED_PREF_KEYS = new Set([
  'firstTrackingAnswered',
  'neverAskBefore',
  'paused',
  'skip',
  'unskip',
]);

/** Applies `PATCH /me/series/:id/prefs`; a string is a 400 message. */
export const patchPrefs = (
  prefs: SeriesPrefs,
  body: unknown,
  now: number,
): SeriesPrefs | string => {
  if (!isRecord(body) || Object.keys(body).length === 0) {
    return 'Nothing to update';
  }
  if (Object.keys(body).some((key) => !ALLOWED_PREF_KEYS.has(key))) {
    return 'Unknown field';
  }
  let next = { ...prefs };
  const skip = body.skip === undefined ? [] : codes(body.skip);
  const unskip = body.unskip === undefined ? [] : codes(body.unskip);
  if (skip === null || unskip === null) {
    return 'Expected episode codes like S02E05';
  }
  if (skip.some((code) => unskip.includes(code))) {
    return 'An episode cannot be skipped and unskipped at once';
  }
  const skipped = new Set([...next.skipped, ...skip]);
  for (const code of unskip) {
    skipped.delete(code);
  }
  next = { ...next, skipped: [...skipped].sort() };
  if (body.firstTrackingAnswered !== undefined) {
    if (typeof body.firstTrackingAnswered !== 'boolean') {
      return 'firstTrackingAnswered must be a boolean';
    }
    next = {
      ...next,
      firstTrackingAnsweredAt: body.firstTrackingAnswered
        ? (next.firstTrackingAnsweredAt ?? now)
        : null,
    };
  }
  if (body.neverAskBefore !== undefined) {
    if (typeof body.neverAskBefore !== 'boolean') {
      return 'neverAskBefore must be a boolean';
    }
    next = { ...next, neverAskBefore: body.neverAskBefore };
  }
  if (body.paused !== undefined) {
    if (
      body.paused !== null &&
      body.paused !== 'keep' &&
      body.paused !== 'hide'
    ) {
      return 'paused must be keep, hide or null';
    }
    next = {
      ...next,
      paused: body.paused,
      pausedAt: body.paused === null ? null : now,
    };
  }
  return next;
};
