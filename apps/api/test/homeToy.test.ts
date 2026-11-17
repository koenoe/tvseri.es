import { HOME_MOMENTS_VERSION, WHERE_SET_PLACES } from '@tvseri.es/constants';
import type { Toy, ToyOfTheDay } from '@tvseri.es/schemas';
import { toyKindOfDay } from '@tvseri.es/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runWithDeadline } from '@/lib/deadline';
import { fetchToyOfTheDay } from '@/lib/home/toy';

import { storedRows } from './cacheRows';
import { db } from './db';
import { onTmdb, requestedUrls } from './fakeHttp';
import {
  bridgeOf,
  endOf,
  fakePathFrom,
  fakeTrending,
} from './fixtures/connected';
import { request } from './request';

const show = (id: number) => ({
  backdrop_path: `/b${id}.jpg`,
  first_air_date: '2008-01-20',
  id,
  name: `Show ${id}`,
  popularity: 10,
  poster_path: `/p${id}.jpg`,
});

/** This week's trending shows: Connected by's starts */
const STARTS = [7001, 7002, 7003];

/** Connected by finds no path from any start */
const unlinked = () => {
  for (const start of STARTS) {
    fakePathFrom(start, { linked: false });
  }
};

const toy = async (date: string) => {
  vi.setSystemTime(new Date(`${date}T10:00:00Z`));
  db.reset();
  const response = await request(`/home/toy?date=${date}`);
  return {
    body: (await response.json()) as ToyOfTheDay,
    cacheControl: response.headers.get('cache-control'),
    status: response.status,
  };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });

  onTmdb('/discover/tv', { results: [1, 2, 3, 4, 5, 6].map(show) });
  // What's on's shows: every one has a logo but show 2
  for (const id of [1, 2, 3, 4, 5, 6]) {
    onTmdb(`/tv/${id}`, show(id));
    onTmdb(`/tv/${id}/images`, {
      backdrops: [{ file_path: `/text-free-${id}.jpg`, iso_639_1: null }],
      logos:
        id === 2 ? [] : [{ file_path: `/logo-${id}.png`, iso_639_1: 'en' }],
      posters: [],
    });
  }
  onTmdb('/watch/providers/tv', {
    results: [
      {
        display_priority: 1,
        logo_path: '/netflix.jpg',
        provider_id: 8,
        provider_name: 'Netflix',
      },
      {
        display_priority: 2,
        logo_path: '/max.jpg',
        provider_id: 1899,
        provider_name: 'HBO Max',
      },
    ],
  });
  onTmdb('/network/2552', {
    id: 2552,
    logo_path: '/appletv.png',
    name: 'Apple TV',
  });
  onTmdb('/network/4330', { id: 4330, logo_path: null, name: 'Paramount+' });
  onTmdb('/network/1024', { id: 1024, logo_path: null, name: 'Prime Video' });
  onTmdb('/network/453', { id: 453, logo_path: '/hulu.png', name: 'Hulu' });

  for (const id of new Set(
    WHERE_SET_PLACES.flatMap((place) => place.showIds),
  )) {
    onTmdb(`/tv/${id}`, show(id));
    // The Wire (Baltimore's first) has a logo; the others have none
    onTmdb(`/tv/${id}/images`, {
      backdrops: [{ file_path: `/text-free-${id}.jpg`, iso_639_1: null }],
      logos:
        id === 1438 ? [{ file_path: '/wire-logo.png', iso_639_1: 'en' }] : [],
      posters: [],
    });
  }
  fakeTrending(STARTS);
  for (const start of STARTS) {
    fakePathFrom(start);
  }
});

describe('GET /home/toy', () => {
  it('rejects a bad date', async () => {
    expect((await request('/home/toy?date=x')).status).toBe(400);
  });

  it('rotates through the toys and draws what each needs (Versus: homeVersus.test.ts)', async () => {
    const seen = new Map<string, Toy>();
    for (const date of ['2026-11-09', '2026-11-10', '2026-11-11']) {
      const { body } = await toy(date);
      seen.set(body.toy.kind, body.toy);
    }

    expect([...seen.keys()].sort()).toEqual([
      'connected-by',
      'whats-on',
      'where-set',
    ]);

    const channels = seen.get('whats-on');
    expect(
      channels &&
        'channels' in channels &&
        channels.channels.map((c) => c.network.name),
    ).toEqual([
      'Netflix',
      'HBO Max',
      'Apple TV',
      'Paramount+',
      'Prime Video',
      'Hulu',
    ]);
    // The service icon where there is one, else the network's wordmark
    expect(
      channels &&
        'channels' in channels &&
        channels.channels.map((c) => [c.network.logoKind, c.network.logo]),
    ).toEqual([
      ['icon', expect.stringContaining('/netflix.jpg')],
      ['icon', expect.stringContaining('/max.jpg')],
      ['wordmark', expect.stringContaining('/appletv.png')],
      // no provider icon listed and no network logo: an empty wordmark
      ['wordmark', ''],
      ['wordmark', ''],
      ['wordmark', expect.stringContaining('/hulu.png')],
    ]);

    // Each channel's show carries its logo when it has one (one URL), read
    // with its artwork: discover's items have none
    const onAir = channels && 'channels' in channels ? channels.channels : [];
    for (const { series } of onAir) {
      if (series.id === 2) {
        expect(series.titleTreatmentImage).toBeUndefined();
      } else {
        expect(series.titleTreatmentImage).toContain(`/logo-${series.id}.png`);
      }
      expect(series.backdropImage).toContain(`/text-free-${series.id}.jpg`);
    }

    const where = seen.get('where-set');
    expect(where && 'places' in where && where.places).toHaveLength(
      WHERE_SET_PLACES.length,
    );
    const baltimore = where && 'places' in where && where.places[0];
    expect(baltimore).toMatchObject({
      lat: 39.2904,
      lng: -76.6122,
      name: 'Baltimore',
    });
    // Each show carries its logo when it has one (one URL), else none
    const shows =
      where && 'places' in where
        ? where.places.flatMap((place) => [place.series, ...place.others])
        : [];
    const wire = shows.find((series) => series.id === 1438);
    expect(wire?.titleTreatmentImage).toContain('/wire-logo.png');
    expect(
      shows.filter((series) => series.titleTreatmentImage).map((s) => s.id),
    ).toEqual([1438]);
    // Baltimore has three shows: the day's pick, then the other two
    expect(
      baltimore && [
        baltimore.series.id,
        ...baltimore.others.map((other) => other.id),
      ],
    ).toEqual(expect.arrayContaining([1438, 4464, 125949]));
    // Albuquerque has two shows: the day's pick, then the other one
    const albuquerque =
      where &&
      'places' in where &&
      where.places.find((place) => place.slug === 'albuquerque');
    expect(
      albuquerque && [
        albuquerque.series.id,
        ...albuquerque.others.map((other) => other.id),
      ],
    ).toEqual(expect.arrayContaining([1396, 60059]));
    expect(albuquerque ? albuquerque.others : []).toHaveLength(1);

    // From the day's trending start, through a show in between, to a
    // well-liked show that isn't trending
    const connected = seen.get('connected-by');
    const first = connected && 'paths' in connected && connected.paths[0];
    expect(first).toMatchObject({ steps: 2 });
    const chain = first
      ? first.nodes.flatMap((node) =>
          node.type === 'show' ? [node.series.id] : [],
        )
      : [];
    const [start] = chain;
    expect(STARTS).toContain(start);
    expect(chain).toEqual(start ? [start, bridgeOf(start), endOf(start)] : []);
    expect(first ? first.nodes.map((node) => node.type) : []).toEqual([
      'show',
      'person',
      'show',
      'person',
      'show',
    ]);
  });

  it('is cached per day and medium at the CDN', async () => {
    const { cacheControl } = await toy('2026-11-11');

    expect(cacheControl).toContain('s-maxage=604800');
    expect(db.dump('Cache').map((item) => item.pk)).toContain(
      `CACHE#home:toy:v${HOME_MOMENTS_VERSION}:2026-11-11`,
    );
  });

  it('serves a partial toy instead of a 5xx when a lookup fails, and keeps it for an hour', async () => {
    // every Baltimore show fails: the place is left out for the day
    for (const id of [1438, 4464, 125949]) {
      onTmdb(`/tv/${id}`, { status_message: 'boom' }, { status: 500 });
    }

    const responses = [];
    for (const date of ['2026-11-09', '2026-11-10', '2026-11-11']) {
      const { body, cacheControl, status } = await toy(date);
      responses.push({ body, cacheControl, status });
    }

    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
    const where = responses.find((r) => r.body.toy.kind === 'where-set');
    expect(where?.cacheControl).toBe('public, max-age=300, s-maxage=3600');
    expect(
      where &&
        'places' in where.body.toy &&
        where.body.toy.places.map((p) => p.slug),
    ).not.toContain('baltimore');
  });
});

describe('fall-through and ?kind=', () => {
  // 14 Nov 2026 is a Connected by day
  const DAY = '2026-11-14';

  it('plans Connected by on the walk day', () => {
    expect(toyKindOfDay(DAY)).toBe('connected-by');
  });

  it('logs the day, the planned kind, what took the slot and why', async () => {
    // no path from any trending start: Connected by has nothing today
    unlinked();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { body } = await toy(DAY);

    expect(body.toy.kind).toBe('whats-on');
    const lines = warn.mock.calls.map(([line]) => String(line));
    const fell = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((line) => line.slot === 'toy');
    expect(fell).toMatchObject({
      date: DAY,
      message: `Home toy: connected-by fell through on ${DAY} to whats-on`,
      planned: 'connected-by',
      used: 'whats-on',
      // Versus is next in the walk: the fakes' shows have no votes, so no pair
      why: ['connected-by: nothing to show', 'versus: nothing to show'],
    });
    warn.mockRestore();
  });

  it('stops trying starts and kinds once the request is nearly out of time', async () => {
    vi.setSystemTime(new Date(`${DAY}T10:00:00Z`));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // 1.5 s left (the clock is frozen): the day's first start's cast only
    const result = await runWithDeadline(1500, () => fetchToyOfTheDay(DAY));

    expect(result).toEqual({ partial: true, result: undefined });
    const credits = requestedUrls().filter((url) =>
      url.pathname.endsWith('/aggregate_credits'),
    );
    expect(credits.length).toBeLessThanOrEqual(2);
    expect(
      requestedUrls().some((url) => url.pathname.includes('/watch/providers')),
    ).toBe(false);
    // Nothing built is not stored: the next read tries again (the trending
    // list MDBList gave is kept, as always)
    expect(
      storedRows().filter((row) => !String(row.pk).includes('mdblist')),
    ).toEqual([]);
  });

  it('builds the asked kind on any day, without falling through', async () => {
    vi.setSystemTime(new Date(`${DAY}T10:00:00Z`));
    db.reset();
    const response = await request(`/home/toy?date=${DAY}&kind=where-set`);
    expect(response.status).toBe(200);
    expect(((await response.json()) as ToyOfTheDay).toy.kind).toBe('where-set');

    unlinked();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const none = await request(`/home/toy?date=${DAY}&kind=connected-by`);
    expect(none.status).toBe(404);
  });

  it('refuses an unknown kind', async () => {
    vi.setSystemTime(new Date(`${DAY}T10:00:00Z`));
    expect((await request(`/home/toy?date=${DAY}&kind=quiz`)).status).toBe(400);
  });
});
