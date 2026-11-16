import { HOME_MOMENTS_VERSION } from '@tvseri.es/constants';
import type { ConnectedFrom } from '@tvseri.es/schemas';
import { rotationIndex } from '@tvseri.es/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { storedRows } from './cacheRows';
import { db } from './db';
import { onTmdb, requestedUrls, resetRequests } from './fakeHttp';
import {
  bridgeOf,
  endOf,
  fakePathFrom,
  fakeTrending,
} from './fixtures/connected';
import { request } from './request';

// a Connected by day (the toy reads the same per-start build)
const DAY = '2026-11-14';
const START = 4001;
const TRENDING = [7001, 7002, 7003];

const tmdbCalls = () =>
  requestedUrls().filter((url) => url.host === 'api.themoviedb.org');

const read = async (query: string) => {
  const response = await request(`/home/connected?${query}`);
  return {
    body: response.ok ? ((await response.json()) as ConnectedFrom) : null,
    cacheControl: response.headers.get('cache-control'),
    status: response.status,
  };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${DAY}T10:00:00Z`));
  db.reset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  fakeTrending(TRENDING);
  for (const start of [START, ...TRENDING]) {
    fakePathFrom(start);
  }
});

describe('GET /home/connected', () => {
  it('validates the start and the date', async () => {
    expect((await read(`from=abc&date=${DAY}`)).status).toBe(400);
    expect((await read(`from=0&date=${DAY}`)).status).toBe(400);
    expect((await read(`from=${START}`)).status).toBe(400);
    expect((await read(`from=${START}&date=2020-01-01`)).status).toBe(400);
  });

  it('answers the two-step paths from the show, CDN-cacheable for the day', async () => {
    const { body, cacheControl, status } = await read(
      `from=${START}&date=${DAY}`,
    );

    expect(status).toBe(200);
    expect(cacheControl).toContain('s-maxage=604800');
    expect(body?.date).toBe(DAY);
    expect(body?.from).toBe(START);
    const [path] = body?.paths ?? [];
    expect(path?.steps).toBe(2);
    expect(path?.nodes.map((node) => node.type)).toEqual([
      'show',
      'person',
      'show',
      'person',
      'show',
    ]);
    expect(
      path?.nodes.flatMap((node) =>
        node.type === 'show' ? [node.series.id] : [],
      ),
    ).toEqual([START, bridgeOf(START), endOf(START)]);
    // two different people, each with their parts on both sides
    const people = path?.nodes.flatMap((node) =>
      node.type === 'person' ? [node.person] : [],
    );
    expect(people?.map((person) => person.id)).toEqual([
      START * 10,
      bridgeOf(START) * 10,
    ]);
    expect(people?.[1]?.characters).toEqual([
      `Lead of ${bridgeOf(START)}`,
      `Hero of ${endOf(START)}`,
    ]);
  });

  it('builds once per show and day, within 30 TMDB calls, and serves every later read from the Cache table', async () => {
    await read(`from=${START}&date=${DAY}`);
    const cold = tmdbCalls().length;
    resetRequests();

    const again = await read(`from=${START}&date=${DAY}`);

    expect(cold).toBeGreaterThan(0);
    expect(cold).toBeLessThanOrEqual(30);
    expect(again.status).toBe(200);
    expect(tmdbCalls()).toEqual([]);
    expect(storedRows().map((row) => row.pk)).toContain(
      `CACHE#home:connected:v${HOME_MOMENTS_VERSION}:${START}:${DAY}`,
    );
  });

  it('never ends at a trending show', async () => {
    fakeTrending([...TRENDING, endOf(START)]);

    const { status } = await read(`from=${START}&date=${DAY}`);

    expect(status).toBe(404);
  });

  it('is a cached 404 from a show with no path, kept so it is not searched again', async () => {
    fakePathFrom(START, { linked: false });

    const first = await read(`from=${START}&date=${DAY}`);
    resetRequests();
    const second = await read(`from=${START}&date=${DAY}`);

    expect(first.status).toBe(404);
    expect(first.cacheControl).toContain('s-maxage=604800');
    expect(second.status).toBe(404);
    expect(tmdbCalls()).toEqual([]);
  });

  it('answers 503, never cached, when failed lookups left it with nothing', async () => {
    onTmdb(
      `/tv/${START}/aggregate_credits`,
      { status_message: 'boom' },
      { status: 500 },
    );

    const { cacheControl, status } = await read(`from=${START}&date=${DAY}`);

    expect(status).toBe(503);
    expect(cacheControl ?? '').not.toContain('s-maxage');
  });

  it('shares the build with the signed-out toy: the toy’s start reads no TMDB again', async () => {
    const toy = await request(`/home/toy?date=${DAY}`);
    expect(toy.status).toBe(200);
    const start =
      TRENDING[rotationIndex(DAY, TRENDING.length, 'connected')] ?? 0;
    resetRequests();

    const { body, status } = await read(`from=${start}&date=${DAY}`);

    expect(status).toBe(200);
    expect(body?.from).toBe(start);
    expect(tmdbCalls()).toEqual([]);
  });
});
