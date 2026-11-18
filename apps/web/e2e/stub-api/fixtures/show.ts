/**
 * The show page's stub routes: The Bear (136315) plus three demo variants
 * (an airing copy, a long-runner, a show over 1,000 aired episodes), the
 * viewer routes behind marking, and the admin's image picker. Writes are
 * stateful in memory (`POST /__stub/reset` restores the seeds). Bodies are
 * shaped with `@tvseri.es/schemas` types; the rules mirror the API's routes
 * (`series.ts`, `me/`, `user/`, `admin.ts`, `dominant-color.ts`).
 *
 * Viewers are read from the Bearer token (see `show/http.ts`): `alex`
 * (regular user, partway through The Bear), `nina` (new, nothing tracked) and
 * `sam` (admin). Run `stub-auth` for tokens (README).
 */
import type {
  ListItem,
  PreferredImages,
  WatchedItem,
} from '@tvseri.es/schemas';

import type { StubRequest, StubResponse, StubRoute } from '../types.ts';
import {
  boardColourFor,
  catalogueShow,
  contentRating,
  episodesOf,
  findEpisode,
  findShow,
  type StubShow,
  seasonNumbers,
  TODAY,
  toCredits,
  toEpisode,
  toEpisodeWithCredits,
  toImages,
  toKeywords,
  toRating,
  toRecommendations,
  toSeason,
  toSeasonRatings,
  toSeries,
  watchProviders,
} from './show/catalog.ts';
import {
  fail,
  isForeignViewer,
  isRecord,
  isResponse,
  ok,
  requireMe,
  requireViewer,
  toNumber,
  userExists,
} from './show/http.ts';
import {
  checkWatchedAt,
  clearSkipped,
  markSeason,
  markShow,
  parseMarkBody,
  patchPrefs,
  unmark,
  watchedList,
} from './show/marking.ts';
import { profileStubShow } from './show/profile-shows.ts';
import {
  deletePreferred,
  episodeKey,
  getPreferred,
  libraryIds,
  reset,
  seriesPrefs,
  seriesWatched,
  setPreferred,
  setSeriesPrefs,
  userState,
  VIEWERS,
} from './show/store.ts';

const NOT_FOUND = fail(404, 'Not Found');

const showOf = (id: string | undefined): StubShow | null => {
  const number = toNumber(id);
  return (number === null ? undefined : findShow(number)) ?? null;
};

/** A show that has started airing (the mark routes 404 otherwise). */
const airedShowOf = (id: string | undefined): StubShow | null => {
  const number = toNumber(id);
  const show =
    showOf(id) ??
    (number === null
      ? undefined
      : (catalogueShow(number) ?? profileStubShow(number))) ??
    null;
  const first = show?.episodes[0];
  return show && first && first.airDate <= TODAY ? show : null;
};

const series = (
  handle: (request: StubRequest, show: StubShow) => StubResponse,
): StubRoute['handle'] => {
  return (request) => {
    // Shows this fixture doesn't have belong to another fixture's catalogue.
    const show = showOf(request.params.id);
    return show ? handle(request, show) : undefined;
  };
};

// --- Catalogue ---------------------------------------------------------

const catalogue: readonly StubRoute[] = [
  {
    handle: series((request, show) =>
      ok(
        toSeries(show, {
          includeImages: request.query.get('include_images') === 'true',
          preferred: getPreferred(show.id),
        }),
      ),
    ),
    path: '/series/:id',
  },
  {
    // the profile's shows too: marking reads their seasons' episodes
    handle: (request) => {
      const id = toNumber(request.params.id);
      const show =
        showOf(request.params.id) ??
        (id === null ? undefined : profileStubShow(id));
      if (!show) {
        return undefined;
      }
      const season = toNumber(request.params.n);
      const body = season === null ? null : toSeason(show, season);
      return body ? ok(body) : NOT_FOUND;
    },
    path: '/series/:id/season/:n',
  },
  {
    // Every regular season's runtimes, index = episode number - 1
    handle: series((_request, show) => {
      const runtimes: Record<number, number[]> = {};
      for (const number of seasonNumbers(show).filter((n) => n > 0)) {
        const minutes: number[] = [];
        for (const episode of episodesOf(show, number)) {
          minutes[episode.number - 1] = episode.runtime;
        }
        runtimes[number] = Array.from(minutes, (value) => value ?? 0);
      }
      return ok(runtimes);
    }),
    path: '/series/:id/runtimes',
  },
  {
    handle: series((request, show) => {
      if (!/^\d{1,2}$/.test(request.params.s ?? '')) {
        return fail(400, 'Expected a season number');
      }
      const season = Number(request.params.s);
      return ok(
        !seasonNumbers(show).includes(season)
          ? { ratings: {} }
          : toSeasonRatings(show, season),
      );
    }),
    path: '/series/:id/season/:s/ratings',
  },
  {
    handle: series((request, show) => {
      const view = request.query.get('view');
      if (view !== null && view !== 'credits') {
        return fail(400, 'Invalid view');
      }
      const season = toNumber(request.params.s);
      const number = toNumber(request.params.e);
      const episode =
        season === null || number === null
          ? undefined
          : findEpisode(show, season, number);
      if (!episode) {
        return NOT_FOUND;
      }
      return ok(
        view === 'credits' ? toEpisodeWithCredits(episode) : toEpisode(episode),
      );
    }),
    path: '/series/:id/season/:s/episode/:e',
  },
  {
    handle: series((request, show) => {
      const language = request.query.get('language');
      return language !== null && !/^[a-z]{2}$/.test(language)
        ? fail(400, 'Invalid language')
        : ok(toImages(getPreferred(show.id)));
    }),
    path: '/series/:id/images',
  },
  {
    handle: series((request, show) =>
      ok(contentRating(request.query.get('region') || 'US', show)),
    ),
    path: '/series/:id/content-rating',
  },
  {
    handle: series((request, show) =>
      ok(watchProviders(request.query.get('region') || 'US', show)),
    ),
    path: '/series/:id/watch-providers',
  },
  {
    handle: series((_request, show) => ok(toCredits(show))),
    path: '/series/:id/credits',
  },
  {
    handle: series((_request, show) => ok(toRecommendations(show))),
    path: '/series/:id/recommendations',
  },
  {
    handle: series((_request, show) => ok(toKeywords(show))),
    path: '/series/:id/keywords',
  },
  {
    handle: series((_request, show) => ok(toRating(show))),
    path: '/series/:id/rating',
  },
];

// --- Viewer: /me ----------------------------------------------------------

const me = (
  handle: (
    request: StubRequest,
    viewer: (typeof VIEWERS)[keyof typeof VIEWERS],
  ) => StubResponse,
): StubRoute['handle'] => {
  return (request) => {
    if (isForeignViewer(request.headers)) {
      return undefined;
    }
    const viewer = requireViewer(request.headers);
    return isResponse(viewer) ? viewer : handle(request, viewer);
  };
};

const mine = (userId: string) => userState(userId);

const meRoutes: readonly StubRoute[] = [
  { handle: me((_request, viewer) => ok(viewer.user)), path: '/me' },
  // Home's spotlight reads it for any signed-in viewer (Back from a show
  // page lands there); this rig's viewers have no lines.
  {
    handle: me(() => ok({ lines: {} })),
    path: '/me/home/spotlight-lines',
  },
  {
    handle: me((_request, viewer) => {
      const state = mine(viewer.id);
      return state ? ok(libraryIds(state)) : NOT_FOUND;
    }),
    path: '/me/library-ids',
  },
  {
    handle: me((request, viewer) => {
      const state = mine(viewer.id);
      const id = toNumber(request.params.id);
      if (!state || id === null) {
        return fail(400, 'Invalid series id');
      }
      return ok({
        isFavorited: state.favorites.has(id),
        isWatchlisted: state.watchlist.has(id),
        prefs: seriesPrefs(state, id),
      });
    }),
    path: '/me/series/:id/status',
  },
  {
    handle: me((request, viewer) => {
      const state = mine(viewer.id);
      const id = toNumber(request.params.id);
      return state && id !== null
        ? ok(seriesPrefs(state, id))
        : fail(400, 'Invalid series id');
    }),
    path: '/me/series/:id/prefs',
  },
  {
    handle: me((request, viewer) => {
      const state = mine(viewer.id);
      const id = toNumber(request.params.id);
      if (!state || id === null) {
        return fail(400, 'Invalid series id');
      }
      const next = patchPrefs(seriesPrefs(state, id), request.body, Date.now());
      if (typeof next === 'string') {
        return fail(400, next);
      }
      setSeriesPrefs(state, id, next);
      return ok(next);
    }),
    method: 'PATCH',
    path: '/me/series/:id/prefs',
  },
];

// --- Viewer: /user/:id ------------------------------------------------------

const PROGRESS_KEYS = [
  'dateUnknown',
  'episodeNumber',
  'runtime',
  'seasonNumber',
  'watchedAt',
] as const;

const TRACK_KEYS = [
  ...PROGRESS_KEYS,
  'watchProviderLogoPath',
  'watchProviderName',
] as const;

const project = (
  items: ReadonlyArray<WatchedItem>,
  keys: ReadonlyArray<keyof WatchedItem>,
) =>
  items.map((item) =>
    Object.fromEntries(
      keys.flatMap((key) => (key in item ? [[key, item[key]]] : [])),
    ),
  );

/** `requireIsMe` plus the user lookup: the state to write to, or a response. */
const asMe = (request: StubRequest) => {
  if (isForeignViewer(request.headers)) {
    return undefined;
  }
  const pathId = request.params.id ?? '';
  const viewer = requireMe(request.headers, pathId);
  if (isResponse(viewer)) {
    return viewer;
  }
  const state = userState(viewer.id);
  return state ? { state, viewer } : NOT_FOUND;
};

const markView = (
  request: StubRequest,
): 'progress' | 'track' | null | undefined => {
  const view = request.query.get('view');
  return view === null
    ? null
    : view === 'progress' || view === 'track'
      ? view
      : undefined;
};

const markResponse = (
  request: StubRequest,
  items: ReadonlyArray<WatchedItem>,
): StubResponse =>
  ok(
    markView(request) === 'progress'
      ? project(items, PROGRESS_KEYS)
      : markView(request) === 'track'
        ? project(items, TRACK_KEYS)
        : items,
    201,
  );

const markRoute =
  (scope: 'season' | 'show'): StubRoute['handle'] =>
  (request) => {
    const who = asMe(request);
    if (who === undefined) {
      return undefined;
    }
    if (isResponse(who)) {
      return who;
    }
    if (markView(request) === undefined) {
      return fail(400, 'Invalid view');
    }
    const body = parseMarkBody(request.body);
    if (typeof body === 'string') {
      return fail(400, body);
    }
    const show = airedShowOf(request.params.sid);
    if (!show) {
      return NOT_FOUND;
    }
    const { state, viewer } = who;
    if (scope === 'show') {
      const items = markShow(state, viewer.id, show, body);
      return items
        ? markResponse(request, items)
        : fail(
            413,
            'Too many episodes to mark at once; mark seasons one by one',
          );
    }
    const season = toNumber(request.params.n);
    if (season === null) {
      return fail(400, 'Invalid season number');
    }
    return episodesOf(show, season).length === 0
      ? NOT_FOUND
      : markResponse(request, markSeason(state, viewer.id, show, season, body));
  };

const unmarkRoute =
  (scope: 'season' | 'show'): StubRoute['handle'] =>
  (request) => {
    const who = asMe(request);
    if (who === undefined) {
      return undefined;
    }
    if (isResponse(who)) {
      return who;
    }
    const show = airedShowOf(request.params.sid);
    if (!show) {
      return NOT_FOUND;
    }
    const season = scope === 'show' ? undefined : toNumber(request.params.n);
    if (season === null) {
      return fail(400, 'Invalid season number');
    }
    unmark(who.state, show.id, { season });
    return ok({ message: 'OK' });
  };

const count = (value: unknown, max: number): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= max;

const str = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;

const isBatch = (body: unknown): body is unknown[] =>
  Array.isArray(body) && body.length >= 1 && body.length <= 50;

const batchRoutes: readonly StubRoute[] = [
  {
    handle: (request) => {
      const who = asMe(request);
      if (who === undefined) {
        return undefined;
      }
      if (isResponse(who)) {
        return who;
      }
      if (!isBatch(request.body)) {
        return fail(400, 'Batch must hold 1 to 50 items');
      }
      const items: WatchedItem[] = [];
      for (const raw of request.body as unknown[]) {
        if (
          !isRecord(raw) ||
          !isRecord(raw.episode) ||
          !isRecord(raw.tvSeries)
        ) {
          return fail(400, 'Invalid batch item');
        }
        const { episode, tvSeries } = raw;
        if (
          !count(episode.episodeNumber, 9999) ||
          !count(episode.seasonNumber, 999) ||
          !count(episode.runtime, 1440) ||
          !str(episode.title, 1000) ||
          !str(episode.airDate, 40) ||
          !str(tvSeries.title, 1000) ||
          !str(tvSeries.slug, 500) ||
          !str(tvSeries.posterPath, 200) ||
          typeof tvSeries.id !== 'number' ||
          checkWatchedAt(raw.watchedAt) !== null
        ) {
          return fail(400, 'Invalid batch item');
        }
        if (raw.userId !== who.viewer.id) {
          return fail(
            403,
            'Forbidden: Some items do not belong to the authenticated user',
          );
        }
        const provider = isRecord(raw.watchProvider)
          ? {
              logoPath: String(raw.watchProvider.logoPath ?? ''),
              name: String(raw.watchProvider.name ?? ''),
            }
          : null;
        const item: WatchedItem = {
          ...(raw.dateUnknown === true && { dateUnknown: true as const }),
          episodeAirDate: episode.airDate,
          episodeNumber: episode.episodeNumber,
          episodeStillPath:
            typeof episode.stillPath === 'string' ? episode.stillPath : null,
          episodeTitle: episode.title,
          posterPath: tvSeries.posterPath,
          runtime: episode.runtime,
          seasonNumber: episode.seasonNumber,
          seriesId: tvSeries.id,
          slug: tvSeries.slug,
          title: tvSeries.title,
          userId: who.viewer.id,
          watchedAt: raw.watchedAt as number,
          ...(provider && {
            watchProviderLogoPath: provider.logoPath,
            watchProviderName: provider.name,
          }),
        };
        items.push(item);
      }
      for (const item of items) {
        seriesWatched(who.state, item.seriesId).set(
          episodeKey(item.seasonNumber, item.episodeNumber),
          item,
        );
        clearSkipped(who.state, item.seriesId, [item]);
      }
      return ok(items, 201);
    },
    method: 'POST',
    path: '/user/:id/watched/batch',
  },
  {
    handle: (request) => {
      const who = asMe(request);
      if (who === undefined) {
        return undefined;
      }
      if (isResponse(who)) {
        return who;
      }
      if (!isBatch(request.body)) {
        return fail(400, 'Batch must hold 1 to 50 items');
      }
      const items = request.body as unknown[];
      const parsed: Array<Readonly<{ e: number; s: number; id: number }>> = [];
      for (const raw of items) {
        if (
          !isRecord(raw) ||
          !isRecord(raw.tvSeries) ||
          typeof raw.tvSeries.id !== 'number' ||
          !count(raw.episodeNumber, 9999) ||
          !count(raw.seasonNumber, 999)
        ) {
          return fail(400, 'Invalid batch item');
        }
        if (raw.userId !== who.viewer.id) {
          return fail(
            403,
            'Forbidden: Some items do not belong to the authenticated user',
          );
        }
        parsed.push({
          e: raw.episodeNumber,
          id: raw.tvSeries.id,
          s: raw.seasonNumber,
        });
      }
      for (const item of parsed) {
        seriesWatched(who.state, item.id).delete(episodeKey(item.s, item.e));
      }
      return ok({ message: 'OK' }, 201);
    },
    method: 'POST',
    path: '/user/:id/watched/batch/delete',
  },
];

const LISTS = new Set(['favorites', 'watchlist']);

const listRoutes: readonly StubRoute[] = [
  {
    handle: (request) => {
      const who = asMe(request);
      if (who === undefined) {
        return undefined;
      }
      if (isResponse(who)) {
        return who;
      }
      const list = request.params.list ?? '';
      const body = request.body;
      if (
        !LISTS.has(list) ||
        !isRecord(body) ||
        typeof body.id !== 'number' ||
        !str(body.title, 1000) ||
        !str(body.slug, 500) ||
        !str(body.posterPath, 200)
      ) {
        return LISTS.has(list) ? fail(400, 'Invalid list item') : NOT_FOUND;
      }
      const item: ListItem = {
        createdAt: Date.now(),
        id: body.id,
        posterImage: '',
        posterPath: body.posterPath,
        slug: body.slug,
        status: (findShow(body.id) ?? { status: 'Ended' as const }).status,
        title: body.title,
      };
      (list === 'favorites' ? who.state.favorites : who.state.watchlist).set(
        item.id,
        item,
      );
      return ok({ message: 'OK' }, 201);
    },
    method: 'POST',
    path: '/user/:id/list/:list',
  },
  {
    handle: (request) => {
      const who = asMe(request);
      if (who === undefined) {
        return undefined;
      }
      if (isResponse(who)) {
        return who;
      }
      const list = request.params.list ?? '';
      const itemId = toNumber(request.params.itemId);
      if (itemId === null || !(LISTS.has(list) || list === 'in_progress')) {
        return NOT_FOUND;
      }
      // `in_progress` is derived from watched episodes here: nothing to remove
      if (list !== 'in_progress') {
        (list === 'favorites'
          ? who.state.favorites
          : who.state.watchlist
        ).delete(itemId);
      }
      return ok({ message: 'OK' });
    },
    method: 'DELETE',
    path: '/user/:id/list/:list/:itemId',
  },
];

const userRoutes: readonly StubRoute[] = [
  {
    handle: (request) => {
      if (isForeignViewer(request.headers)) {
        return undefined;
      }
      const viewer = requireViewer(request.headers);
      if (isResponse(viewer)) {
        return viewer;
      }
      const pathId = request.params.id ?? '';
      const state = userExists(pathId) ? userState(pathId) : undefined;
      const view = request.query.get('view');
      if (view !== null && view !== 'progress' && view !== 'track') {
        return fail(400, 'Invalid view');
      }
      const seriesId = toNumber(request.params.sid);
      if (!state || seriesId === null) {
        return NOT_FOUND;
      }
      const items = watchedList(state, seriesId);
      return ok(
        view === 'progress'
          ? project(items, PROGRESS_KEYS)
          : view === 'track'
            ? project(items, TRACK_KEYS)
            : items,
      );
    },
    path: '/user/:id/watched/series/:sid',
  },
  ...batchRoutes,
  {
    handle: markRoute('show'),
    method: 'POST',
    path: '/user/:id/watched/series/:sid',
  },
  {
    handle: markRoute('season'),
    method: 'POST',
    path: '/user/:id/watched/series/:sid/season/:n',
  },
  {
    handle: unmarkRoute('show'),
    method: 'DELETE',
    path: '/user/:id/watched/series/:sid',
  },
  {
    handle: unmarkRoute('season'),
    method: 'DELETE',
    path: '/user/:id/watched/series/:sid/season/:n',
  },
  ...listRoutes,
];

// --- Admin: preferred images and the page colour -------------------------

const admin = (
  handle: (request: StubRequest, id: number) => StubResponse,
): StubRoute['handle'] => {
  return (request) => {
    if (isForeignViewer(request.headers)) {
      return undefined;
    }
    const viewer = requireViewer(request.headers);
    if (isResponse(viewer)) {
      return viewer;
    }
    // The API answers 401 for a signed-in non-admin too (`requireAuthAdmin`)
    if (viewer.user.role !== 'admin') {
      return fail(401, 'Unauthorized');
    }
    const id = toNumber(request.params.id);
    return id === null ? NOT_FOUND : handle(request, id);
  };
};

const isPreferredImages = (body: unknown): body is PreferredImages =>
  isRecord(body) &&
  typeof body.backdropColor === 'string' &&
  typeof body.backdropImagePath === 'string' &&
  (body.titleTreatmentImagePath === undefined ||
    typeof body.titleTreatmentImagePath === 'string') &&
  (body.titleTreatment === undefined || body.titleTreatment === 'text');

/** A dark colour from the image name, standing in for the dominant colour. */
const colourFor = (name: string): string => {
  const hue = [...name].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) % 360,
    11,
  );
  const lightness = 0.2;
  const saturation = 0.35;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value =
      lightness - (chroma / 2) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
};

const adminRoutes: readonly StubRoute[] = [
  {
    handle: admin((request, id) => {
      if (!isPreferredImages(request.body)) {
        return fail(400, 'Invalid preferred images');
      }
      setPreferred(id, request.body);
      return ok({ message: 'OK' });
    }),
    method: 'PUT',
    path: '/admin/preferred-images/series/:id',
  },
  {
    handle: admin((_request, id) => {
      deletePreferred(id);
      return ok({ message: 'OK' });
    }),
    method: 'DELETE',
    path: '/admin/preferred-images/series/:id',
  },
  {
    // The real route accepts TMDB image URLs only; the stub also takes its own
    // `/img/<name>` URLs, because the local images aren't on TMDB.
    handle: (request) => {
      const url = request.query.get('url') ?? '';
      const name =
        /^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+\/([^/]+)$/.exec(url)?.[1] ??
        /^https?:\/\/[^/]+\/img\/([^/]+)$/.exec(url)?.[1];
      return name
        ? ok({ hex: boardColourFor(name) ?? colourFor(name) })
        : {
            body: { error: 'Only TMDB image URLs are supported' },
            status: 400,
          };
    },
    path: '/dominant-color',
  },
];

const testRoutes: readonly StubRoute[] = [
  {
    handle: ({ query }) => {
      const user = query.get('user');
      if (user !== null && !(user in VIEWERS)) {
        return { body: { message: 'Unknown viewer' }, status: 400 };
      }
      reset((user ?? undefined) as Parameters<typeof reset>[0]);
      return ok({ ok: true });
    },
    method: 'POST',
    path: '/__stub/reset',
  },
];

export const routes: readonly StubRoute[] = [
  ...catalogue,
  ...meRoutes,
  ...userRoutes,
  ...adminRoutes,
  ...testRoutes,
];
