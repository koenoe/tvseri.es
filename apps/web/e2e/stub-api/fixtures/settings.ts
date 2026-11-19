import {
  CONNECTION_SERVICES,
  type ConnectionService,
  type ConnectionStatus,
  type User,
  type WebhookStatus,
} from '@tvseri.es/schemas';

import type { StubRequest, StubResponse, StubRoute } from '../types.ts';
import {
  isSettingsViewer,
  requireSettingsViewer,
  type SettingsViewer,
} from './settings/http.ts';
import {
  allSettingsUsers,
  meOf,
  plexMarks,
  providersFor,
  settingsOf,
  stubPlexUrlWorks,
} from './settings/store.ts';
import { fail, isRecord, isResponse, ok, requireViewer } from './show/http.ts';

/**
 * Settings: the profile, services and region, the numbers in the header,
 * and the Plex status line. Import, Connected apps and Your data add their
 * own files (`settings-*.ts`) on the same store.
 */

const NOT_CONNECTED: ConnectionStatus = {
  connected: false,
  lastSyncedAt: null,
  latest: null,
  profileName: null,
  recent: [],
  status: null,
  sync: null,
  total: null,
  unresolvedCount: 0,
  week: [],
};

const isConnectionService = (
  value: string | undefined,
): value is ConnectionService =>
  (CONNECTION_SERVICES as ReadonlyArray<string | undefined>).includes(value);

const me =
  (handle: (request: StubRequest, viewer: SettingsViewer) => StubResponse) =>
  (request: StubRequest): StubResponse | undefined => {
    const viewer = requireSettingsViewer(request.headers);
    if (isSettingsViewer(viewer)) {
      return handle(request, viewer);
    }
    // Another fixture's viewer (Home's issuer, the profile's visitors): their
    // own fixtures answer. Without a token it is the API's 401.
    return request.headers.authorization && !isOurs(request)
      ? undefined
      : viewer;
  };

/** A token for one of the settings store's viewers (deleted ones included). */
const isOurs = (request: StubRequest): boolean => {
  const viewer = requireViewer(request.headers);
  return !isResponse(viewer) && settingsOf(viewer.id) !== undefined;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Usernames the stub treats as taken by someone else. */
const TAKEN = new Set(['admin', 'settings', 'tvseries', 'margaux']);

const isTaken = (username: string, selfId: string): boolean =>
  TAKEN.has(username) ||
  allSettingsUsers().some((u) => u.username === username && u.id !== selfId);

const publicUser = (user: User) => ({
  createdAt: user.createdAt,
  id: user.id,
  role: user.role,
  username: user.username,
  version: user.version,
  watchProviders: user.watchProviders ?? [],
});

const userState = (id: string) => settingsOf(id);

const count =
  (pick: (c: NonNullable<ReturnType<typeof userState>>['counts']) => number) =>
  (request: StubRequest): StubResponse | undefined => {
    const state = userState(request.params.id ?? '');
    // Other fixtures' users (stats, profile) pass on to their routes
    return state ? ok({ count: pick(state.counts) }) : undefined;
  };

const plexStatus = (viewer: SettingsViewer): WebhookStatus => {
  const plex = viewer.state.plex;
  if (!plex) {
    return { connected: false };
  }
  return {
    connected: true,
    createdAt: plex.createdAt,
    lastAccount: plex.lastAccount,
    lastReceivedAt: plex.lastReceivedAt,
    onlyAccount: plex.onlyAccount,
    paused: plex.paused,
    ...plexMarks(plex),
    urlWorks: stubPlexUrlWorks(),
  };
};

/**
 * The viewer's own account (`GET`/`PUT /me`, services) and the region's
 * services: `__account.ts` serves these before the profile fixtures, so a
 * settings edit (and `lastImport`) is what every page's `GET /me` sees.
 */
export const ACCOUNT_ROUTES: readonly StubRoute[] = [
  {
    handle: me((_request, { state }) => ok(meOf(state))),
    path: '/me',
  },
  {
    handle: me(({ body }, { id, state }) => {
      if (!isRecord(body)) {
        return fail(400, 'Invalid body');
      }
      const { country, name, username } = body;
      if (
        country === undefined &&
        name === undefined &&
        username === undefined
      ) {
        return fail(400, 'Nothing to update');
      }
      if (
        country !== undefined &&
        (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country))
      ) {
        return fail(400, 'Invalid country');
      }
      if (
        name !== undefined &&
        (typeof name !== 'string' || name.length > 128)
      ) {
        return fail(400, 'Invalid name');
      }
      if (username !== undefined) {
        if (
          typeof username !== 'string' ||
          username.length < 3 ||
          username.length > 128 ||
          !SLUG.test(username)
        ) {
          return fail(400, 'Invalid username');
        }
        if (isTaken(username, id)) {
          return fail(409, 'UsernameAlreadyTaken');
        }
      }
      state.user = {
        ...state.user,
        ...(typeof country === 'string' && { country }),
        ...(typeof name === 'string' && { name }),
        ...(typeof username === 'string' && { username }),
        updatedAt: new Date().toISOString(),
      };
      return ok(meOf(state));
    }),
    method: 'PUT',
    path: '/me',
  },
  {
    handle: me(({ body }, { state }) => {
      if (!isRecord(body) || !Array.isArray(body.watchProviders)) {
        return fail(400, 'Invalid body');
      }
      state.user = {
        ...state.user,
        watchProviders: body.watchProviders as User['watchProviders'],
      };
      return ok(meOf(state));
    }),
    method: 'PUT',
    path: '/me/watch-providers',
  },
  {
    handle: ({ query }) =>
      ok(providersFor((query.get('region') ?? 'US').toUpperCase())),
    path: '/discover/watch-providers',
  },
];

export const routes: readonly StubRoute[] = [
  {
    handle: ({ params }) => {
      const user = allSettingsUsers().find(
        (u) => u.username === params.username?.toLowerCase(),
      );
      if (user) {
        return ok(publicUser(user));
      }
      return TAKEN.has(params.username ?? '')
        ? ok({
            createdAt: '2024-01-01T00:00:00.000Z',
            id: '01STUBTAKEN000000000000000',
            role: 'user',
            username: params.username,
            version: 1,
            watchProviders: [],
          })
        : undefined;
    },
    path: '/user/by-username/:username',
  },
  { handle: count((c) => c.episodes), path: '/user/:id/watched/count' },
  {
    handle: ({ params }) => {
      const state = userState(params.id ?? '');
      return state ? ok({ runtime: state.counts.runtime }) : undefined;
    },
    path: '/user/:id/watched/runtime',
  },
  {
    handle: (request) => {
      if (!userState(request.params.id ?? '')) {
        return undefined;
      }
      if (request.params.list === 'watched') {
        return count((c) => c.shows)(request);
      }
      return request.params.list === 'in_progress'
        ? count((c) => c.watching)(request)
        : ok({ count: 0 });
    },
    path: '/user/:id/list/:list/count',
  },
  { handle: count((c) => c.followers), path: '/user/:id/followers/count' },
  { handle: count((c) => c.following), path: '/user/:id/following/count' },
  {
    handle: ({ params }) => {
      const state = userState(params.id ?? '');
      return state
        ? ok({
            years: state.counts.years.map((year, index) => ({
              episodes: 400 - index * 10,
              year,
            })),
          })
        : undefined;
    },
    path: '/user/:id/stats/years',
  },
  {
    handle: me(({ params }, viewer) =>
      params.type === 'plex' ? ok(plexStatus(viewer)) : fail(404, 'Not found'),
    ),
    path: '/webhook/type/:type/status',
  },
  {
    // Every service card's status: never linked in the e2e world
    handle: (request) =>
      isConnectionService(request.params.service)
        ? me(() => ok(NOT_CONNECTED))(request)
        : undefined,
    path: '/me/connections/:service',
  },
  {
    // Never linked, so nothing to review
    handle: (request) =>
      isConnectionService(request.params.service)
        ? me(() => ok({ items: [], nextCursor: null }))(request)
        : undefined,
    path: '/me/connections/:service/unresolved',
  },
];
