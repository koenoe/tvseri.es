import type {
  LastImport,
  RecentScrobble,
  ScrobbleAccount,
  User,
  WatchProvider,
} from '@tvseri.es/schemas';

import { img, imgPath } from '../show/catalog.ts';
import { VIEWERS } from '../show/store.ts';
import { PEOPLE } from '../user-profile/people.ts';

/**
 * The settings streams' slice of the stub: per viewer, what Settings reads
 * and writes (profile edits, services, region, the last import, the Plex
 * link, a pending deletion) and the numbers the hero shows. It lives as long
 * as the stub process.
 *
 * Viewers come from the show stream's store (`alex`, `rae`, `nina`, `sam`).
 */

export type ViewerName = keyof typeof VIEWERS;

const provider = (
  id: number,
  name: string,
  file: string,
  color: string,
): WatchProvider => ({
  color,
  id,
  logo: img(file),
  logoPath: imgPath(file),
  name,
});

/** The UK services in TMDB's display order (`/discover/watch-providers`). */
const GB_PROVIDERS: ReadonlyArray<WatchProvider> = [
  provider(8, 'Netflix', 'st_prov_netflix.png', '#e50914'),
  provider(38, 'BBC iPlayer', 'st_prov_iplayer.png', '#ff4c98'),
  provider(350, 'Apple TV', 'st_prov_appletv.png', '#000000'),
  provider(9, 'Prime Video', 'st_prov_prime.png', '#00a8e1'),
  provider(337, 'Disney+', 'pp_prov_disney.png', '#0b2a5b'),
  provider(41, 'ITVX', 'st_prov_itvx.png', '#102c3d'),
  provider(103, 'Channel 4', 'set_prov_channel4.png', '#2a2a2a'),
  provider(39, 'NOW', 'set_prov_now.png', '#0d2e2a'),
  provider(29, 'Sky Go', 'st_prov_skygo.png', '#1b2c66'),
  provider(582, 'Paramount+', 'st_prov_paramount.png', '#0064ff'),
  provider(1899, 'HBO Max', 'set_prov_hbomax.png', '#002be7'),
  provider(584, 'discovery+', 'set_prov_discovery.png', '#0042e5'),
  provider(283, 'Crunchyroll', 'set_prov_crunchyroll.png', '#f47521'),
];

/**
 * TMDB's real UK list is long (dozens of services), so Popular folds there
 * (the fold rule: more than 3 hidden): six invented ones make the stub's
 * list fold too, as the placeholder assumes.
 */
const GB_MORE: ReadonlyArray<WatchProvider> = Array.from(
  { length: 6 },
  (_, index) => {
    const base = GB_PROVIDERS[index % GB_PROVIDERS.length];
    return provider(
      8000 + index,
      `Example UK Stream ${index + 1}`,
      base?.logoPath.split('/').pop() ?? 'st_prov_netflix.png',
      base?.color ?? '#333333',
    );
  },
);

const byName = (name: string): WatchProvider => {
  const found = GB_PROVIDERS.find((p) => p.name === name);
  if (!found) {
    throw new Error(`stub provider ${name}`);
  }
  return found;
};

/**
 * Germany has a long list (60 services: the 13 above and 47 invented ones),
 * the one that makes the Popular card offer "Show all".
 */
const DE_PROVIDERS: ReadonlyArray<WatchProvider> = [
  ...GB_PROVIDERS,
  ...Array.from({ length: 47 }, (_, index) => {
    const base = GB_PROVIDERS[index % GB_PROVIDERS.length];
    return provider(
      9000 + index,
      `Example Stream ${index + 1}`,
      base?.logoPath.split('/').pop() ?? 'st_prov_netflix.png',
      base?.color ?? '#333333',
    );
  }),
];

/** Other regions get a short list: enough to see the region change. */
export const providersFor = (region: string): ReadonlyArray<WatchProvider> =>
  region === 'GB'
    ? [...GB_PROVIDERS, ...GB_MORE]
    : region === 'DE'
      ? DE_PROVIDERS
      : GB_PROVIDERS.filter((p) =>
          [
            'Netflix',
            'Prime Video',
            'Disney+',
            'Apple TV',
            'Paramount+',
          ].includes(p.name),
        );

/**
 * Whether the edge passes a viewer's Plex URL (`urlWorks` in the status).
 * Always true unless `STUB_PLEX_URL_WORKS=false`, which shows the card's
 * "This URL isn’t working" state for every viewer with a URL.
 */
export const stubPlexUrlWorks = (): boolean =>
  process.env.STUB_PLEX_URL_WORKS !== 'false';

export type StubPlex = {
  token: string;
  createdAt: string;
  paused: boolean;
  onlyAccount: ScrobbleAccount | null;
  lastAccount: ScrobbleAccount | null;
  lastReceivedAt: number | null;
  /** Every Plex mark, newest first */
  recent: RecentScrobble[];
};

const WEEK_MS = 8 * 24 * 60 * 60 * 1000;

/** The status's two lists, as the API reads them: the latest 5 and the last 8 days */
export const plexMarks = (plex: StubPlex) => {
  const since = Date.now() - WEEK_MS;
  return {
    recent: plex.recent.slice(0, 5),
    week: plex.recent.filter((mark) => mark.watchedAt >= since).slice(0, 200),
  };
};

export type StubCounts = {
  episodes: number;
  /** Finished shows (WATCHED list) */
  shows: number;
  /** Shows watched in part (IN_PROGRESS list): "shows" in Settings is these plus the finished ones */
  watching: number;
  /** All-time minutes */
  runtime: number;
  followers: number;
  following: number;
  /** Years with dated marks, newest first */
  years: number[];
};

export type SettingsState = {
  /** Profile edits on top of the show store's user (username, name, country, services) */
  user: User;
  lastImport?: LastImport;
  /** Episodes written by imports: `<seriesId>-S01E02` -> import id (settings-import.ts) */
  importMarks?: Map<string, string>;
  plex: StubPlex | null;
  deletionRequestedAt?: number;
  counts: StubCounts;
};

const HOUR = 60 * 60 * 1000;

/**
 * Episodes of Billions marked through Plex, `[days ago, hours earlier]`, laid
 * out on calendar days (`plexMarkAt`) so each day's count holds at any hour
 */
const PLEX_WEEK: ReadonlyArray<readonly [number, number]> = [
  // today: two, an hour apart
  [0, 1],
  [0, 2],
  // yesterday: one
  [1, 0],
  // two days ago: nothing; three days ago: a binge of twelve
  ...Array.from({ length: 12 }, (_, i) => [3, i * 0.75] as const),
  // four days ago: three
  [4, 0],
  [4, 1],
  [4, 2],
  // six days ago: one
  [6, 0],
  // older than the week: only in the latest list when it is short
  [12, 0],
];

/**
 * A mark's moment: earlier days count back from 20:00 local (a binge of
 * 8 hours stays inside its day), today's marks sit just after local midnight
 * (never in the future, never yesterday), whatever time the test runs
 */
const plexMarkAt = (now: number, days: number, hours: number): number => {
  const today = new Date(now);
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - days,
  ).getTime();
  if (days === 0) {
    return Math.min(now, start + (3 - hours) * 60_000);
  }
  return new Date(start).setHours(20) - hours * HOUR;
};

const recentFor = (now: number): RecentScrobble[] =>
  PLEX_WEEK.map(([days, hours], index) => {
    const episode = PLEX_WEEK.length - index;
    return {
      episodeNumber: ((episode - 1) % 12) + 1,
      ...(index === 0 && { episodeTitle: 'Hostile Takeover' }),
      seasonNumber: 3 + Math.floor((episode - 1) / 12),
      seriesId: 62852,
      title: 'Billions',
      watchedAt: plexMarkAt(now, days, hours),
    };
  });

const PLEX_ACCOUNT: ScrobbleAccount = { id: 1, title: 'alex' };

const seedFor = (name: ViewerName): SettingsState => {
  const now = Date.now();
  // The profile fixtures' person when there is one (same id), so the profile
  // stream's pages see the same viewer this answers `GET /me` with.
  const person = name in PEOPLE ? PEOPLE[name as keyof typeof PEOPLE] : null;
  const base = person?.user ?? VIEWERS[name].user;
  switch (name) {
    case 'alex':
    case 'kit':
    case 'rae':
      return {
        counts: {
          episodes: 4812,
          followers: 6,
          following: 8,
          runtime: 158_400,
          shows: 212,
          watching: 0,
          years: [
            2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016,
          ],
        },
        plex: {
          createdAt: '2025-02-01T10:00:00.000Z',
          lastAccount: { ...PLEX_ACCOUNT, title: name },
          lastReceivedAt: now - HOUR,
          onlyAccount: { ...PLEX_ACCOUNT, title: name },
          paused: false,
          recent: recentFor(now),
          token:
            name === 'alex'
              ? '3f9c1a7e5b2d4c8e9a0b6f12'
              : '7c2e9b4d1a6f3e8c5b0d2a94',
        },
        // alex is the profile stream's viewer too: their services stay as the
        // profile fixtures have them; rae (who writes) has six.
        user:
          name === 'alex'
            ? base
            : {
                ...base,
                watchProviders: [
                  byName('Netflix'),
                  byName('BBC iPlayer'),
                  byName('Apple TV'),
                  byName('Prime Video'),
                  byName('Disney+'),
                  byName('ITVX'),
                ],
              },
      };
    // the profile's heavy and medium owners: big numbers for the overflow spec
    case 'marathonwatcher-2026':
    case 'mira':
      return {
        counts: {
          episodes: name === 'mira' ? 642 : 98_765,
          followers: name === 'mira' ? 12 : 1234,
          following: name === 'mira' ? 9 : 987,
          runtime: name === 'mira' ? 30_000 : 5_999_940,
          shows: name === 'mira' ? 37 : 12_048,
          watching: name === 'mira' ? 8 : 312,
          years: [
            2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016,
            2015, 2014, 2013, 2012,
          ],
        },
        plex: null,
        user: base,
      };
    case 'nina':
    case 'seenit':
      return {
        counts: {
          episodes: 0,
          followers: 0,
          following: 0,
          runtime: 0,
          shows: 0,
          watching: 0,
          years: [],
        },
        plex: null,
        user: { ...base, watchProviders: [] },
      };
    case 'sam':
      return {
        counts: {
          episodes: 312,
          followers: 2,
          following: 3,
          runtime: 9_900,
          shows: 14,
          watching: 5,
          years: [2026, 2025, 2024],
        },
        plex: {
          createdAt: '2026-11-12T08:00:00.000Z',
          lastAccount: null,
          lastReceivedAt: null,
          onlyAccount: null,
          paused: false,
          recent: [],
          token: '0a1b2c3d4e5f60718293a4b5',
        },
        user: { ...base, watchProviders: [byName('Netflix')] },
      };
  }
};

const stateById = new Map<string, SettingsState>();

const nameOf = (id: string): ViewerName | undefined =>
  (Object.keys(VIEWERS) as ViewerName[]).find((n) => VIEWERS[n].id === id);

/** The settings state of a viewer id (seeded on first use). */
export const settingsOf = (userId: string): SettingsState | undefined => {
  const name = nameOf(userId.toUpperCase());
  if (!name) {
    return undefined;
  }
  const id = VIEWERS[name].id;
  let state = stateById.get(id);
  if (!state) {
    state = seedFor(name);
    stateById.set(id, state);
  }
  return state;
};

/** Every viewer's current user (for username lookups). */
export const allSettingsUsers = (): ReadonlyArray<User> =>
  (Object.keys(VIEWERS) as ViewerName[]).map(
    (n) => (settingsOf(VIEWERS[n].id) as SettingsState).user,
  );

/** `GET /me` as the API answers it: the user plus `lastImport` when set. */
export const meOf = (state: SettingsState): User =>
  state.lastImport
    ? { ...state.user, lastImport: state.lastImport }
    : state.user;
