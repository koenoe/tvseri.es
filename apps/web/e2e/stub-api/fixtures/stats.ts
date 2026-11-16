/**
 * The Stats page's user and stats routes for the invented user `lena`
 * (data in `stats/`). Board images for local screenshots are served from the
 * folder in env `BOARD_IMG_DIR` at `/img/stats/:file`; without it the bodies
 * carry no image URLs.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { StubResponse, StubRoute } from '../types';
import { segment, years } from './stats/build';
import {
  buildTvSeries,
  POPULAR_TITLES,
  SERIES_BY_ID,
  seriesByTitle,
} from './stats/series';
import {
  ALL_TIME_RUNTIME,
  buildUser,
  EPISODES_WATCHED,
  FOLLOWERS,
  FOLLOWING,
  LIST_COUNTS,
  USER_ID,
  USERNAME,
} from './stats/user';

const NOT_FOUND: StubResponse = {
  body: { message: 'User not found' },
  status: 404,
};

const json = (body: unknown): StubResponse => ({ body });

/** Answers for the stub user only; any other id is a 404. */
const forUser =
  (
    build: (params: Readonly<Record<string, string>>) => StubResponse,
  ): StubRoute['handle'] =>
  ({ params }) =>
    params.id === USER_ID ? build(params) : NOT_FOUND;

const SEGMENTS = [
  'summary',
  'favorites-count',
  'spotlight',
  'weekly',
  'genres',
  'providers',
  'countries',
  'watched-series',
  'shows',
  'finished',
  'daily',
  'when',
  'new-or-back',
] as const;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

const notFound = (): StubResponse => ({
  body: { message: 'Not found (stub API)' },
  status: 404,
});

const image = async (file: string | undefined): Promise<StubResponse> => {
  const dir = process.env.BOARD_IMG_DIR;
  // Plain file names only: no path walking out of the folder
  if (!dir || !file || file !== path.basename(file)) {
    return notFound();
  }
  const type = CONTENT_TYPES[path.extname(file)];
  if (!type) {
    return notFound();
  }
  try {
    return {
      body: new Uint8Array(await readFile(path.join(dir, file))),
      headers: {
        'cache-control': 'public, max-age=86400',
        'content-type': type,
      },
    };
  } catch {
    return notFound();
  }
};

const SEED_USERNAME = 'example';

export const routes: readonly StubRoute[] = [
  {
    // Looked up as the API does (slugified: `LENA` is `lena`). `example` is
    // the Stats page's build seed (generateStaticParams): the same data under
    // its own username, so the seed URL prerenders with data.
    handle: ({ params }) => {
      const slug = params.username?.toLowerCase().replace(/[^a-z0-9-]/g, '');
      return slug === USERNAME || slug === SEED_USERNAME
        ? json(buildUser(slug))
        : NOT_FOUND;
    },
    path: '/user/by-username/:username',
  },
  { handle: forUser(() => json(buildUser())), path: '/user/:id' },
  {
    handle: forUser(() => json({ count: EPISODES_WATCHED })),
    path: '/user/:id/watched/count',
  },
  {
    handle: forUser(() => json({ runtime: ALL_TIME_RUNTIME })),
    path: '/user/:id/watched/runtime',
  },
  {
    handle: forUser(({ list }) =>
      json({ count: LIST_COUNTS[list ?? ''] ?? 0 }),
    ),
    path: '/user/:id/list/:list/count',
  },
  {
    handle: forUser(() => json({ count: FOLLOWERS })),
    path: '/user/:id/followers/count',
  },
  {
    handle: forUser(() => json({ count: FOLLOWING })),
    path: '/user/:id/following/count',
  },
  // The zone the user's stats count in
  {
    handle: forUser(() => json({ timeZone: 'UTC' })),
    path: '/user/:id/stats/zone',
  },
  { handle: forUser(() => json(years())), path: '/user/:id/stats/years' },
  ...SEGMENTS.map(
    (name): StubRoute => ({
      handle: forUser(({ year }) => {
        const value = /^\d{4}$/.test(year ?? '')
          ? segment(Number(year), name)
          : undefined;
        return value === undefined
          ? { body: { message: 'Invalid year' }, status: 400 }
          : json(value);
      }),
      path: `/user/:id/stats/:year/${name}`,
    }),
  ),
  {
    handle: () =>
      json(POPULAR_TITLES.map((title) => buildTvSeries(seriesByTitle(title)))),
    path: '/popular/:year',
  },
  {
    handle: ({ params }) => {
      const series = SERIES_BY_ID.get(Number(params.id));
      return series ? json(buildTvSeries(series)) : undefined;
    },
    path: '/series/:id',
  },
  { handle: ({ params }) => image(params.file), path: '/img/stats/:file' },
];
