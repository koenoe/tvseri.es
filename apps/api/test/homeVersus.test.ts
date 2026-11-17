import { HOME_MOMENTS_VERSION } from '@tvseri.es/constants';
import type { ToyOfTheDay, VersusPair } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { onTmdb, requestedUrls, resetRequests } from './fakeHttp';
import { request } from './request';

/** Sun 15 Nov 2026 plans Versus (signed in too: not an If you liked X day) */
const DAY = '2026-11-15';

const DRAMA = 18;

/** A TMDB list item: a well-known drama with a poster */
const listItem = (id: number, votes = 2000) => ({
  // a backdrop too, so What's on can take the slot when Versus gives it away
  backdrop_path: `/b${id}.jpg`,
  first_air_date: '2017-12-01',
  genre_ids: [DRAMA],
  id,
  name: `Show ${id}`,
  popularity: 100 - id,
  poster_path: `/p${id}.jpg`,
  vote_average: 8.4,
  vote_count: votes,
});

/** The same series' details: three seasons, 26 aired episodes, ended */
const details = (id: number) => ({
  ...listItem(id),
  genres: [{ id: DRAMA, name: 'Drama' }],
  last_air_date: '2020-06-27',
  last_episode_to_air: {
    air_date: '2020-06-27',
    episode_number: 8,
    id: id * 1000,
    name: 'Finale',
    season_number: 3,
  },
  number_of_episodes: 26,
  number_of_seasons: 3,
  seasons: [
    { air_date: '2017-12-01', episode_count: 10, id: 1, season_number: 1 },
    { air_date: '2019-06-21', episode_count: 8, id: 2, season_number: 2 },
    { air_date: '2020-06-27', episode_count: 8, id: 3, season_number: 3 },
  ],
  status: 'Ended',
});

const SEEDS = Array.from({ length: 20 }, (_, n) => n + 1);

const tmdbCalls = () =>
  requestedUrls().filter((url) => url.host === 'api.themoviedb.org');

const toyOn = async (date: string) => {
  const response = await request(`/home/toy?date=${date}`);
  return {
    body: (await response.json()) as ToyOfTheDay,
    cacheControl: response.headers.get('cache-control'),
    status: response.status,
  };
};

const pairsOf = (body: ToyOfTheDay): ReadonlyArray<VersusPair> =>
  body.toy.kind === 'versus' ? body.toy.pairs : [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${DAY}T10:00:00Z`));
  onTmdb('/discover/tv', { results: SEEDS.map((id) => listItem(id)) });
  for (const id of SEEDS) {
    // each seed's most similar series is 100 + its id
    onTmdb(`/tv/${id}/recommendations`, {
      results: [listItem(100 + id, 1500)],
    });
    onTmdb(`/tv/${id}`, details(id));
    onTmdb(`/tv/${100 + id}`, details(100 + id));
  }
});

describe('Versus, the toy of the day', () => {
  it('draws a deck of similar pairs with just what the card needs', async () => {
    const { body, cacheControl, status } = await toyOn(DAY);

    expect(status).toBe(200);
    expect(cacheControl).toContain('s-maxage=604800');
    expect(body.toy.kind).toBe('versus');
    const pairs = pairsOf(body);
    expect(pairs.length).toBeGreaterThan(1);
    expect(pairs[0]?.left).toEqual({
      episodes: 26,
      id: expect.any(Number),
      posterImage: expect.stringContaining('/p'),
      seasons: 3,
      slug: expect.stringMatching(/^show-\d+$/),
      title: expect.stringMatching(/^Show \d+$/),
      voteAverage: 8.4,
      years: '2017–2020',
    });
    for (const { left, right } of pairs) {
      expect(right.id).toBe(left.id + 100);
    }
    expect(db.dump('Cache').map((item) => item.pk)).toContain(
      `CACHE#home:toy:v${HOME_MOMENTS_VERSION}:${DAY}`,
    );
  });

  it('is built once a day: a warm read asks TMDB nothing', async () => {
    await toyOn(DAY);
    const cold = tmdbCalls().length;
    resetRequests();

    const { body } = await toyOn(DAY);

    // one discover page, one recommendation list per seed, two details per pair
    expect(cold).toBe(1 + 6 + 12);
    expect(pairsOf(body)).toHaveLength(6);
    expect(tmdbCalls()).toEqual([]);
  });

  it('serves the stored deck, short-cached, when TMDB is down for the rebuild', async () => {
    const first = pairsOf((await toyOn(DAY)).body);
    // past the build's 24 hours, still the same day key; TMDB answers 500
    vi.setSystemTime(new Date(`${DAY}T10:00:00Z`).getTime() + 25 * 3_600_000);
    onTmdb('/discover/tv', { status_message: 'down' }, { status: 500 });

    const again = await toyOn(DAY);

    expect(again.status).toBe(200);
    expect(pairsOf(again.body)).toEqual(first);
  });

  it('builds Versus alone with ?kind=versus, and 404s when no pair qualifies', async () => {
    vi.setSystemTime(new Date('2026-11-14T10:00:00Z'));
    const asked = await request('/home/toy?date=2026-11-14&kind=versus');
    expect(asked.status).toBe(200);
    expect(((await asked.json()) as ToyOfTheDay).toy.kind).toBe('versus');

    db.reset();
    // no recommendation shares a genre: no pair
    for (const id of SEEDS) {
      onTmdb(`/tv/${id}/recommendations`, {
        results: [{ ...listItem(100 + id), genre_ids: [35] }],
      });
    }
    const none = await request('/home/toy?date=2026-11-14&kind=versus');
    expect(none.status).toBe(404);
  });

  it('gives the slot to the next toy when no pair qualifies', async () => {
    for (const id of SEEDS) {
      onTmdb(`/tv/${id}/recommendations`, { results: [] });
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { body } = await toyOn(DAY);

    expect(body.toy.kind).not.toBe('versus');
    const fell = warn.mock.calls
      .map(([line]) => String(line))
      .find((line) => line.includes('"slot":"toy"'));
    expect(fell).toContain('versus: nothing to show');
    warn.mockRestore();
  });
});
