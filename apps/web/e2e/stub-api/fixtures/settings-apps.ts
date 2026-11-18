import { randomBytes } from 'node:crypto';

import type { TvSeries } from '@tvseri.es/schemas';

import type { StubRequest, StubResponse, StubRoute } from '../types.ts';
import {
  isSettingsViewer,
  requireSettingsViewer,
  type SettingsViewer,
} from './settings/http.ts';
import { plexMarks, stubPlexUrlWorks } from './settings/store.ts';
import { img, imgPath } from './show/catalog.ts';
import { fail, isRecord, ok } from './show/http.ts';

/**
 * Connected apps and Your data on the settings store (`settings/store.ts`):
 * the Plex token, pause and whose plays count, the two exports, and delete
 * account. Reads `state.plex`; writes use `rae`.
 */

const me =
  (handle: (request: StubRequest, viewer: SettingsViewer) => StubResponse) =>
  (request: StubRequest): StubResponse => {
    const viewer = requireSettingsViewer(request.headers);
    return isSettingsViewer(viewer) ? handle(request, viewer) : viewer;
  };

const isPlex = (params: Readonly<Record<string, string>>) =>
  params.type === 'plex';

const newToken = (): string => randomBytes(12).toString('hex');

const status = (viewer: SettingsViewer) => {
  const plex = viewer.state.plex;
  return plex
    ? {
        connected: true,
        createdAt: plex.createdAt,
        lastAccount: plex.lastAccount,
        lastReceivedAt: plex.lastReceivedAt,
        onlyAccount: plex.onlyAccount,
        paused: plex.paused,
        ...plexMarks(plex),
        urlWorks: stubPlexUrlWorks(),
      }
    : { connected: false };
};

/** The show behind Plex's last scrobble (the Last scrobble panel's backdrop and logo). */
const BILLIONS: TvSeries = {
  backdropColor: '#16212b',
  backdropImage: img('st_bd_billions.jpg'),
  backdropPath: imgPath('st_bd_billions.jpg'),
  countries: [{ code: 'US', name: 'United States' }],
  createdBy: [],
  description:
    'A power struggle between a US attorney and a hedge fund manager.',
  firstAirDate: '2016-01-17T00:00:00.000Z',
  genres: [{ id: 18, name: 'Drama', slug: 'drama' }],
  hasAired: true,
  id: 62852,
  isAdult: false,
  languages: [{ code: 'en', englishName: 'English', name: 'English' }],
  lastAirDate: '2023-10-13T00:00:00.000Z',
  numberOfAiredEpisodes: 84,
  numberOfEpisodes: 84,
  numberOfSeasons: 7,
  originalLanguage: 'en',
  originalTitle: 'Billions',
  popularity: 100,
  posterImage: img('st_p_billions.jpg'),
  posterPath: imgPath('st_p_billions.jpg'),
  releaseYear: '2016',
  slug: 'billions',
  status: 'Ended',
  tagline: '',
  title: 'Billions',
  titleTreatmentImage: img('st_logo_billions.png'),
  type: 'Scripted',
  voteAverage: 8,
  voteCount: 1000,
};

const today = () => new Date().toISOString().slice(0, 10);

/** One row per watched episode, oldest first (`GET /me/export/history.csv`). */
const historyCsv = (episodes: number): string => {
  const rows = ['title,season,episode,date,watchProvider'];
  for (let index = 0; index < episodes; index += 1) {
    const season = 1 + Math.floor(index / 12);
    const episode = 1 + (index % 12);
    const day = new Date(Date.UTC(2016, 0, 1) + index * 86_400_000 * 0.7);
    // every 40th episode has no date
    const date = index % 40 === 0 ? '' : day.toISOString().slice(0, 10);
    rows.push(`Billions,${season},${episode},${date},Netflix`);
  }
  return `${rows.join('\n')}\n`;
};

export const routes: readonly StubRoute[] = [
  { handle: () => ok(BILLIONS), path: '/series/62852' },
  {
    handle: me(({ params }, viewer) =>
      isPlex(params)
        ? ok({ token: viewer.state.plex?.token ?? null })
        : fail(404, 'Not found'),
    ),
    path: '/webhook/type/:type',
  },
  {
    // A New URL replaces the token and keeps pause and whose plays count.
    handle: me(({ params }, viewer) => {
      if (!isPlex(params)) {
        return fail(404, 'Not found');
      }
      const { state } = viewer;
      state.plex = state.plex
        ? { ...state.plex, token: newToken() }
        : {
            createdAt: new Date().toISOString(),
            lastAccount: null,
            lastReceivedAt: null,
            onlyAccount: null,
            paused: false,
            recent: [],
            token: newToken(),
          };
      return ok({ token: state.plex.token }, 201);
    }),
    method: 'POST',
    path: '/webhook/type/:type',
  },
  {
    handle: me(({ body, params }, viewer) => {
      const plex = viewer.state.plex;
      if (!isPlex(params) || !plex) {
        return fail(404, 'Not connected');
      }
      if (!isRecord(body)) {
        return fail(400, 'Invalid body');
      }
      const { onlyAccountId, paused } = body;
      if (onlyAccountId === undefined && paused === undefined) {
        return fail(400, 'Nothing to update');
      }
      if (paused !== undefined && typeof paused !== 'boolean') {
        return fail(400, 'Invalid paused');
      }
      if (onlyAccountId !== undefined && onlyAccountId !== null) {
        if (!plex.lastAccount || onlyAccountId !== plex.lastAccount.id) {
          return fail(
            400,
            'Only the account of the last scrobble can be chosen',
          );
        }
      }
      if (typeof paused === 'boolean') {
        plex.paused = paused;
      }
      if (onlyAccountId === null) {
        plex.onlyAccount = null;
      } else if (onlyAccountId !== undefined) {
        plex.onlyAccount = plex.lastAccount;
      }
      return ok(status(viewer));
    }),
    method: 'PATCH',
    path: '/webhook/type/:type',
  },
  {
    handle: me(({ params }, viewer) => {
      if (!isPlex(params)) {
        return fail(404, 'Not found');
      }
      viewer.state.plex = null;
      return ok({ message: 'OK' });
    }),
    method: 'DELETE',
    path: '/webhook/type/:type',
  },
  {
    handle: me((_request, { state }) => ({
      body: historyCsv(state.counts.episodes),
      headers: {
        'content-disposition': `attachment; filename="tvseries-history-${today()}.csv"`,
        'content-type': 'text/csv; charset=utf-8',
      },
    })),
    path: '/me/export/history.csv',
  },
  {
    handle: me((_request, { state }) => ({
      body: {
        connections: { plex: state.plex !== null },
        exportedAt: new Date().toISOString(),
        followers: [],
        following: [],
        lists: {},
        prefs: [],
        profile: state.user,
        watched: [],
      },
      headers: {
        'content-disposition': `attachment; filename="tvseries-everything-${today()}.json"`,
        'content-type': 'application/json; charset=utf-8',
      },
    })),
    path: '/me/export/everything.json',
  },
  {
    handle: me(({ body }, { state }) => {
      if (!isRecord(body) || typeof body.confirm !== 'string') {
        return fail(400, 'Invalid body');
      }
      if (body.confirm !== state.user.username) {
        return fail(400, 'Type your username to confirm');
      }
      state.plex = null;
      state.deletionRequestedAt = Date.now();
      return ok({ status: 'queued' }, 202);
    }),
    method: 'DELETE',
    path: '/me',
  },
];
