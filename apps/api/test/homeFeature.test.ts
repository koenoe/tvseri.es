import { LambdaClient } from '@aws-sdk/client-lambda';
import { HOME_MOMENTS_VERSION } from '@tvseri.es/constants';
import type { Feature, FeatureOfTheDay } from '@tvseri.es/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { onTmdb, setUpstreamConditions } from './fakeHttp';
import { request } from './request';

const day = (date: string) => {
  vi.setSystemTime(new Date(`${date}T10:00:00Z`));
  db.reset();
};

const show = (id: number, extra: Record<string, unknown> = {}) => ({
  backdrop_path: `/b${id}.jpg`,
  first_air_date: '2008-01-20',
  id,
  last_air_date: '2013-09-29',
  name: `Show ${id}`,
  poster_path: `/p${id}.jpg`,
  status: 'Ended',
  vote_count: 9000,
  ...extra,
});

const details = (id: number) => ({
  ...show(id),
  last_episode_to_air: {
    air_date: '2013-09-29',
    episode_number: 8,
    id: 1,
    name: 'Last',
    runtime: 60,
    season_number: 2,
  },
  number_of_episodes: 16,
  seasons: [
    { episode_count: 8, id: 1, name: 'Season 1', season_number: 1 },
    { episode_count: 8, id: 2, name: 'Season 2', season_number: 2 },
  ],
});

const stillImages = {
  stills: [
    {
      aspect_ratio: 1.778,
      file_path: '/still.jpg',
      height: 1080,
      vote_average: 6,
      vote_count: 3,
      width: 1920,
    },
  ],
};

/** The DominantColor Lambda's answer for a backdrop: `/b3.jpg` → #1a2b03 */
const colorOf = (url: string) =>
  `#1a2b${(/\/b(\d+)\.jpg/.exec(url)?.[1] ?? '').padStart(2, '0')}`;

/** The DominantColor Lambda detects every backdrop (`colorOf`) */
const detectColors = () =>
  vi
    .spyOn(LambdaClient.prototype, 'send')
    .mockImplementation(async (command: unknown) => {
      const { Payload } = (command as Readonly<{ input: { Payload: string } }>)
        .input;
      const { url } = JSON.parse(Payload) as Readonly<{ url: string }>;
      return {
        Payload: new TextEncoder().encode(
          JSON.stringify({ color: colorOf(url) }),
        ),
      };
    });

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  detectColors();

  const pool = [1, 2, 3, 4, 5].map((id) => show(id));
  // Generic first: later, more specific routes win
  onTmdb(
    '/discover/tv',
    { results: pool },
    { query: { sort_by: 'popularity.desc' } },
  );
  onTmdb(
    '/discover/tv',
    { results: pool },
    { query: { sort_by: 'vote_average.desc' } },
  );
  onTmdb(
    '/discover/tv',
    {
      results: [
        show(20, { first_air_date: '1999-01-10' }),
        show(21, { first_air_date: '2001-01-01' }),
      ],
    },
    { query: { sort_by: 'vote_average.desc', 'vote_count.gte': '2000' } },
  );
  // No premieres around, so the Countdown stays out of the way
  for (const date of ['11', '12', '13', '14', '15']) {
    onTmdb(
      '/discover/tv',
      { results: [] },
      { query: { 'first_air_date.gte': `2026-11-${date}` } },
    );
    onTmdb(
      '/discover/tv',
      { results: [] },
      { query: { 'air_date.gte': `2026-11-${date}` } },
    );
  }
  for (const id of [1, 2, 3, 4, 5]) {
    onTmdb(`/tv/${id}`, details(id));
    onTmdb(`/tv/${id}/season/2`, {
      air_date: '2013-01-01',
      episodes: Array.from({ length: 8 }, (_, i) => ({
        air_date: '2013-01-01',
        episode_number: i + 1,
        id: i,
        name: `Ep ${i + 1}`,
        season_number: 2,
      })),
      id: 2,
      name: 'Season 2',
      poster_path: '/season-poster.jpg',
      season_number: 2,
    });
    for (let e = 1; e <= 8; e++) {
      onTmdb(`/tv/${id}/season/2/episode/${e}/images`, stillImages);
    }
  }
});

const feature = async (date: string) => {
  day(date);
  const response = await request(`/home/feature?date=${date}`);
  return {
    body: (await response.json()) as FeatureOfTheDay,
    cacheControl: response.headers.get('cache-control'),
    status: response.status,
  };
};

describe('GET /home/feature', () => {
  it('rejects a bad date and one far from today', async () => {
    day('2026-11-12');

    expect((await request('/home/feature?date=nope')).status).toBe(400);
    expect((await request('/home/feature?date=2026-11-20')).status).toBe(400);
    expect((await request('/home/feature')).status).toBe(400);
  });

  it('rotates through binge, stills, archive and did-you-know, one per day', async () => {
    const kinds: string[] = [];
    for (const date of ['2026-11-11', '2026-11-12', '2026-11-13']) {
      kinds.push((await feature(date)).body.feature.kind);
    }
    // Consecutive days never repeat
    expect(kinds[0]).not.toBe(kinds[1]);
    expect(kinds[1]).not.toBe(kinds[2]);
  });

  it('builds every moment with the data it draws', async () => {
    const seen = new Map<string, FeatureOfTheDay['feature']>();
    // Four days walk the whole rotation (a step coprime with 4)
    for (const date of [
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]) {
      day(date);
      const result = (await feature(date)).body.feature;
      seen.set(result.kind, result);
    }

    expect([...seen.keys()].sort()).toEqual([
      'archive',
      'binge',
      'did-you-know',
      'stills',
    ]);

    const binge = seen.get('binge');
    expect(binge).toMatchObject({
      episodeRuntime: 60,
      numberOfEpisodes: 16,
      totalMinutes: 960,
    });

    const stills = seen.get('stills');
    expect(stills).toMatchObject({
      season: { numberOfEpisodes: 8, seasonNumber: 2 },
    });
    // every qualifying episode of the 8-episode season (6 to 12)
    expect(stills && 'stills' in stills && stills.stills).toHaveLength(8);

    const archive = seen.get('archive');
    expect(archive).toMatchObject({
      kind: 'archive',
      rank: expect.any(Number),
    });

    const facts = seen.get('did-you-know');
    expect(facts && 'facts' in facts && facts.facts).toHaveLength(4);
    expect(facts && 'facts' in facts && facts.facts[0]).toMatchObject({
      type: 'hours',
      value: 16,
    });
  });

  it('cached per day and medium at the CDN', async () => {
    const { cacheControl } = await feature('2026-11-12');

    expect(cacheControl).toContain('s-maxage=604800');
    expect(db.dump('Cache').map((item) => item.pk)).toContain(
      `CACHE#home:feature:v${HOME_MOMENTS_VERSION}:2026-11-12`,
    );
  });

  it('serves a partial feature when an image lookup fails, and keeps it for an hour', async () => {
    for (const id of [1, 2, 3, 4, 5]) {
      onTmdb(`/tv/${id}/season/2/episode/3/images`, { x: 1 }, { status: 500 });
    }

    const results = [];
    for (const date of [
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]) {
      const { body, cacheControl, status } = await feature(date);
      results.push({ body, cacheControl, status });
    }

    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    const stills = results.find((r) => r.body.feature.kind === 'stills');
    expect(stills?.cacheControl).toBe('public, max-age=300, s-maxage=3600');
    // the episode whose image lookup failed is left out (still six or more)
    expect(
      stills && 'stills' in stills.body.feature && stills.body.feature.stills,
    ).toHaveLength(7);
  });
});

describe('?kind= (the dev preview)', () => {
  it('builds the asked moment on any day, and refuses an unknown one', async () => {
    day('2026-11-12');
    for (const kind of ['binge', 'archive', 'did-you-know'] as const) {
      const response = await request(
        `/home/feature?date=2026-11-12&kind=${kind}`,
      );
      expect(response.status).toBe(200);
      expect(((await response.json()) as FeatureOfTheDay).feature.kind).toBe(
        kind,
      );
    }
    expect(
      (await request('/home/feature?date=2026-11-12&kind=countdown')).status,
    ).toBe(400);
  });
});

describe('the feature right after midnight while TMDB is down', () => {
  it('serves yesterday’s, kept at the CDN for 30 seconds, instead of nothing', async () => {
    const built = await feature('2026-11-12');
    expect(built.status).toBe(200);
    setUpstreamConditions({ outage: { retryAfter: 60, status: 429 } });

    // Ten minutes past midnight (`day()` would empty the table)
    vi.setSystemTime(new Date('2026-11-13T00:10:00Z'));
    const response = await request('/home/feature?date=2026-11-13');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=0, s-maxage=30',
    );
    expect(((await response.json()) as FeatureOfTheDay).date).toBe(
      '2026-11-12',
    );
  });
});

describe('the backdrop’s colour on the cards drawn on their backdrop', () => {
  const didYouKnow = async () => {
    day('2026-11-12');
    const response = await request(
      '/home/feature?date=2026-11-12&kind=did-you-know',
    );
    return {
      feature: ((await response.json()) as FeatureOfTheDay).feature,
      status: response.status,
    };
  };

  const colors = (feature: Feature) =>
    'facts' in feature
      ? feature.facts.map((fact) => fact.series.backdropColor)
      : [];

  it('Did you know: each fact’s show carries its backdrop’s colour', async () => {
    const { feature } = await didYouKnow();

    expect(feature.kind).toBe('did-you-know');
    expect(colors(feature)).toHaveLength(4);
    for (const fact of 'facts' in feature ? feature.facts : []) {
      expect(fact.series.backdropColor).toBe(
        colorOf(fact.series.backdropPath ?? ''),
      );
    }
  });

  it('Did you know: a failed detection keeps the default and the moment', async () => {
    vi.spyOn(LambdaClient.prototype, 'send').mockRejectedValue(
      new Error('timed out'),
    );

    const { feature, status } = await didYouKnow();

    expect(status).toBe(200);
    expect(colors(feature)).toEqual([
      '#000000',
      '#000000',
      '#000000',
      '#000000',
    ]);
  });

  it('the Countdown: each premiere’s show carries its backdrop’s colour', async () => {
    // A popular new series tonight: the Countdown takes the slot
    onTmdb(
      '/discover/tv',
      {
        results: [show(30, { first_air_date: '2026-11-12', popularity: 400 })],
      },
      { query: { 'first_air_date.gte': '2026-11-12' } },
    );
    onTmdb('/tv/30', {
      ...show(30, { first_air_date: '2026-11-12', popularity: 400 }),
      seasons: [
        { episode_count: 2, id: 30, name: 'Season 1', season_number: 1 },
      ],
    });

    const { body, status } = await feature('2026-11-12');

    expect(status).toBe(200);
    expect(body.feature.kind).toBe('countdown');
    expect(
      'premieres' in body.feature &&
        body.feature.premieres.map((premiere) => premiere.series.backdropColor),
    ).toEqual([colorOf('/b30.jpg')]);
  });
});
