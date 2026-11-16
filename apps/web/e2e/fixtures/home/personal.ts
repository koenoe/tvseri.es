import type {
  BecauseYouWatched,
  GetStartedStatus,
  MoreGenre,
  Overview,
  TvSeries,
  UpNextItem,
} from '@tvseri.es/schemas';

import { img, series } from './base.ts';
import { ok, type StubRoute } from './routes.ts';

/**
 * The signed-in touches of home (HMFinal, HMFinalMobile phone 2), with the
 * boards' shows and copy: Continue watching (`/me/overview` + the first
 * show's `/series/:id`), Get started, "Because you watched Severance" and
 * "More Sci-Fi & Fantasy". The demo member is the invented "nina".
 */

const DAY = 86_400_000;

/** The Up next tile's show (backdrop, logo) */
export const DEXTER_RESURRECTION: TvSeries = series({
  backdrop: 'st_bd_dexres.jpg',
  color: '#0f2327',
  genre: 'Crime',
  id: 259909,
  logo: 'st_logo_dexres.png',
  poster: 'st_p_dexres.jpg',
  seasons: 2,
  title: 'Dexter: Resurrection',
  year: '2025',
});

type UpNextInput = Pick<
  UpNextItem,
  | 'code'
  | 'episode'
  | 'season'
  | 'seasonTotal'
  | 'seasonWatched'
  | 'seriesId'
  | 'slug'
  | 'timeLeftMinutes'
  | 'title'
  | 'toWatch'
> &
  Partial<UpNextItem> & { poster: string };

const upNextItem = ({ poster, ...input }: UpNextInput): UpNextItem => ({
  isLatest: false,
  lastWatchedAt: null,
  lastWatchedCode: null,
  nextSeasonTba: false,
  nextToAir: null,
  posterImage: img(poster),
  runtime: null,
  seasonFinale: false,
  ...input,
});

/**
 * The board's Continue watching for a clock `now`: Dexter: Resurrection
 * last watched yesterday, then Task, The White Lotus and Black Mirror in the
 * lane, and a fifth show so the count reads 5.
 */
export function upNext(now: number): ReadonlyArray<UpNextItem> {
  return [
    upNextItem({
      airDate: '2026-11-08',
      code: 'S02E02',
      episode: 2,
      episodeTitle: 'Fallen',
      isLatest: true,
      lastWatchedAt: now - DAY,
      lastWatchedCode: 'S02E01',
      nextToAir: { airDate: '2026-11-15', episode: 4, season: 2 },
      poster: 'st_p_dexres.jpg',
      runtime: 58,
      season: 2,
      seasonTotal: 8,
      seasonWatched: 1,
      seriesId: 259909,
      slug: 'dexter-resurrection',
      timeLeftMinutes: 406,
      title: 'Dexter: Resurrection',
      toWatch: 2,
    }),
    upNextItem({
      code: 'S01E06',
      episode: 6,
      lastWatchedAt: now - 3 * DAY,
      poster: 'st_p_task.jpg',
      runtime: 60,
      season: 1,
      seasonTotal: 7,
      seasonWatched: 5,
      seriesId: 250307,
      slug: 'task',
      timeLeftMinutes: 120,
      title: 'Task',
      toWatch: 2,
    }),
    upNextItem({
      code: 'S03E03',
      episode: 3,
      lastWatchedAt: now - 5 * DAY,
      poster: 'st_p_whitelotus.jpg',
      runtime: 60,
      season: 3,
      seasonTotal: 8,
      seasonWatched: 2,
      seriesId: 111803,
      slug: 'the-white-lotus',
      timeLeftMinutes: 360,
      title: 'The White Lotus',
      toWatch: 6,
    }),
    upNextItem({
      code: 'S07E04',
      episode: 4,
      lastWatchedAt: now - 8 * DAY,
      poster: 'st_p_blackmirror.jpg',
      runtime: 63,
      season: 7,
      seasonTotal: 6,
      seasonWatched: 3,
      seriesId: 42009,
      slug: 'black-mirror',
      timeLeftMinutes: 190,
      title: 'Black Mirror',
      toWatch: 3,
    }),
    upNextItem({
      code: 'S05E02',
      episode: 2,
      lastWatchedAt: now - 12 * DAY,
      poster: 'ds_slowhorses_p.jpg',
      runtime: 50,
      season: 5,
      seasonTotal: 6,
      seasonWatched: 1,
      seriesId: 95480,
      slug: 'slow-horses',
      timeLeftMinutes: 250,
      title: 'Slow Horses',
      toWatch: 5,
    }),
  ];
}

const overview = (items: ReadonlyArray<UpNextItem>): Overview => ({
  almostDone: { closest: null, items: [] },
  catchingUp: [],
  comingUp: [],
  outNow: [],
  paused: [],
  upNext: items,
});

/** A new user's Get started, nothing done yet (HMFinal: "0 of 3") */
export const GET_STARTED_NEW: GetStartedStatus = {
  doneAt: null,
  doneCount: 0,
  hidden: false,
  steps: { alreadySeen: false, history: false, services: false },
};

/** Partly done: the services picked */
export const GET_STARTED_PARTLY: GetStartedStatus = {
  doneAt: null,
  doneCount: 1,
  hidden: false,
  steps: { alreadySeen: false, history: false, services: true },
};

const GET_STARTED_HIDDEN: GetStartedStatus = {
  doneAt: null,
  doneCount: 3,
  hidden: true,
  steps: { alreadySeen: true, history: true, services: true },
};

/** "Because you watched Severance" (HMFinal `hx-h-bec`), reasons as the API builds them */
export const BECAUSE_YOU_WATCHED: BecauseYouWatched = {
  items: [
    {
      reason: { kind: 'network', label: 'Apple TV' },
      series: series({
        genre: 'Sci-Fi & Fantasy',
        id: 125988,
        poster: 'ds_silo_p.jpg',
        seasons: 2,
        title: 'Silo',
        year: '2023',
      }),
    },
    {
      reason: { kind: 'recommendation', label: '' },
      series: series({
        genre: 'Sci-Fi & Fantasy',
        id: 70523,
        poster: 'ds_dark_p.jpg',
        seasons: 3,
        title: 'Dark',
        year: '2017',
      }),
    },
    {
      reason: { kind: 'keyword', label: 'dystopia' },
      series: series({
        genre: 'Sci-Fi & Fantasy',
        id: 225171,
        poster: 'ds_pluribus_p.jpg',
        seasons: 1,
        title: 'Pluribus',
        year: '2025',
      }),
    },
    {
      reason: { kind: 'recommendation', label: '' },
      series: series({
        genre: 'Drama',
        id: 245703,
        poster: 'st_p_paradise.jpg',
        seasons: 1,
        title: 'Paradise',
        year: '2025',
      }),
    },
    {
      reason: { kind: 'keyword', label: 'dystopia' },
      series: series({
        genre: 'Sci-Fi & Fantasy',
        id: 71886,
        poster: 'pq_p_electricdreams.jpg',
        seasons: 1,
        title: 'Philip K. Dick’s Electric Dreams',
        year: '2017',
      }),
    },
    {
      reason: { kind: 'recommendation', label: '' },
      series: series({
        genre: 'Sci-Fi & Fantasy',
        id: 84958,
        poster: 'ds_loki_p.jpg',
        seasons: 2,
        title: 'Loki',
        year: '2021',
      }),
    },
    {
      reason: { kind: 'keyword', label: 'dystopia' },
      series: series({
        genre: 'Sci-Fi & Fantasy',
        id: 105248,
        poster: 'ds_edgerunners_p.jpg',
        seasons: 1,
        title: 'Cyberpunk: Edgerunners',
        year: '2022',
      }),
    },
  ],
  source: {
    from: 'favorite',
    id: 95396,
    series: series({
      genre: 'Drama',
      id: 95396,
      poster: 'ds_severance_p.jpg',
      seasons: 2,
      title: 'Severance',
      year: '2022',
    }),
    title: 'Severance',
  },
};

/** "More Sci-Fi & Fantasy" (HMFinal `hx-h-wl`): half of a sample of 8 */
export const MORE_GENRE: MoreGenre = {
  genre: { id: 10765, name: 'Sci-Fi & Fantasy' },
  items: [
    series({
      backdrop: 'ds_dark_bd.jpg',
      genre: 'Sci-Fi & Fantasy',
      id: 70523,
      logo: 'ds_dark_logo.png',
      seasons: 3,
      title: 'Dark',
      year: '2017',
    }),
    series({
      backdrop: 'ds_andor_bd.jpg',
      genre: 'Sci-Fi & Fantasy',
      id: 83867,
      seasons: 2,
      title: 'Andor',
      year: '2022',
    }),
    series({
      backdrop: 'ds_onepiece_bd.jpg',
      genre: 'Sci-Fi & Fantasy',
      id: 111110,
      seasons: 2,
      title: 'One Piece',
      year: '2023',
    }),
    series({
      backdrop: 'ds_got_bd.jpg',
      genre: 'Sci-Fi & Fantasy',
      id: 1399,
      seasons: 8,
      title: 'Game of Thrones',
      year: '2011',
    }),
    series({
      backdrop: 'ds_avatar_bd.jpg',
      genre: 'Sci-Fi & Fantasy',
      id: 246,
      seasons: 3,
      title: 'Avatar: The Last Airbender',
      year: '2005',
    }),
  ],
  share: { matching: 4, sampled: 8 },
};

/** Stub routes: the member gets the board's personal home, the new user Get started */
export const PERSONAL_ROUTES: Readonly<Record<string, StubRoute>> = {
  '/me/get-started': (_url, _state, viewer) =>
    ok(viewer === 'new' ? GET_STARTED_NEW : GET_STARTED_HIDDEN),
  '/me/home/because-you-watched': (_url, _state, viewer) =>
    ok(viewer === 'member' ? BECAUSE_YOU_WATCHED : { items: [], source: null }),
  '/me/home/more-genre': (_url, _state, viewer) =>
    ok(
      viewer === 'member'
        ? MORE_GENRE
        : { genre: null, items: [], share: { matching: 0, sampled: 0 } },
    ),
  '/me/overview': (_url, _state, viewer) =>
    ok(overview(viewer === 'member' ? upNext(Date.now()) : [])),
  [`/series/${DEXTER_RESURRECTION.id}`]: () => ok(DEXTER_RESURRECTION),
};
