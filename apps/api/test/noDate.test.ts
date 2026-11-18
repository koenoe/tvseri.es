import { describe, expect, it } from 'vitest';
import { fakeShow } from './fixtures/tmdb';
import { markEpisode } from './markEpisode';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const SHOW = 1396;

const setup = () => {
  seedUser();
  fakeShow({ id: SHOW, seasons: [{ airDate: '2020-01-01', episodes: 3 }] });
};

const history = async () => {
  const response = await request(`/user/${USER_ID}/watched`, { as: USER_ID });
  return (
    (await response.json()) as { items: Array<{ episodeNumber: number }> }
  ).items;
};

const showProgress = async () => {
  const response = await request(
    `/user/${USER_ID}/watched/series/${SHOW}?view=progress`,
    { as: USER_ID },
  );
  return (await response.json()) as Array<Record<string, unknown>>;
};

const count = async () => {
  const response = await request(`/user/${USER_ID}/watched/count`, {
    as: USER_ID,
  });
  return ((await response.json()) as { count: number }).count;
};

describe('no date ("I don\'t remember")', () => {
  it('marks one episode without a date: in progress, out of history', async () => {
    setup();
    const response = await markEpisode({
      dateUnknown: true,
      episode: 2,
      show: SHOW,
    });
    expect(response.status).toBe(201);
    const [item] = (await response.json()) as Array<Record<string, unknown>>;
    expect(item).toMatchObject({ dateUnknown: true, episodeNumber: 2 });
    expect(typeof item?.watchedAt).toBe('number');

    expect(await history()).toEqual([]);
    expect(await showProgress()).toEqual([
      expect.objectContaining({
        dateUnknown: true,
        episodeNumber: 2,
        seasonNumber: 1,
      }),
    ]);
    expect(await count()).toBe(1);
  });

  it('leaves dateUnknown out of responses for dated marks', async () => {
    setup();
    const response = await markEpisode({ episode: 1, show: SHOW });
    const [item] = (await response.json()) as Array<Record<string, unknown>>;
    expect(item).not.toHaveProperty('dateUnknown');
    expect(await history()).toHaveLength(1);
  });

  it('marks the whole show without dates (Finished it all)', async () => {
    setup();
    const response = await request(`/user/${USER_ID}/watched/series/${SHOW}`, {
      as: USER_ID,
      body: { dateUnknown: true, watchProvider: null },
      method: 'POST',
    });
    expect(response.status).toBe(201);
    expect(await history()).toEqual([]);
    expect(await showProgress()).toHaveLength(3);
    expect(await count()).toBe(3);
    const runtime = await request(`/user/${USER_ID}/watched/runtime`, {
      as: USER_ID,
    });
    expect(await runtime.json()).toEqual({ runtime: 90 });
  });

  it('marks a season without dates', async () => {
    setup();
    await request(`/user/${USER_ID}/watched/series/${SHOW}/season/1`, {
      as: USER_ID,
      body: { dateUnknown: true, watchProvider: null },
      method: 'POST',
    });
    expect(await history()).toEqual([]);
    expect(await showProgress()).toHaveLength(3);
  });

  it('marks a batch without dates, and a later dated mark brings it back into history', async () => {
    setup();
    const item = (episodeNumber: number, extra: Record<string, unknown>) => ({
      episode: {
        airDate: '2020-01-01T00:00:00.000Z',
        episodeNumber,
        runtime: 30,
        seasonNumber: 1,
        stillPath: null,
        title: `Episode ${episodeNumber}`,
      },
      tvSeries: { id: SHOW, posterPath: '/p.jpg', slug: 'show', title: 'Show' },
      userId: USER_ID,
      watchedAt: Date.UTC(2024, 0, 1),
      ...extra,
    });
    const undated = await request(`/user/${USER_ID}/watched/batch`, {
      as: USER_ID,
      body: [item(1, { dateUnknown: true }), item(2, { dateUnknown: true })],
      method: 'POST',
    });
    expect(undated.status).toBe(201);
    expect(await history()).toEqual([]);

    await request(`/user/${USER_ID}/watched/batch`, {
      as: USER_ID,
      body: [item(1, {})],
      method: 'POST',
    });
    expect(await history()).toEqual([
      expect.objectContaining({
        episodeNumber: 1,
        watchedAt: Date.UTC(2024, 0, 1),
      }),
    ]);
    const progress = await showProgress();
    expect(
      progress.find((entry) => entry.episodeNumber === 1),
    ).not.toHaveProperty('dateUnknown');
  });

  it('marks one episode on a chosen date', async () => {
    setup();
    const watchedAt = Date.UTC(2025, 5, 1, 20);
    await markEpisode({ episode: 1, show: SHOW, watchedAt });
    expect(await history()).toEqual([
      expect.objectContaining({ episodeNumber: 1, watchedAt }),
    ]);
  });

  it('rejects a date in the future', async () => {
    setup();
    const response = await markEpisode({
      episode: 1,
      show: SHOW,
      watchedAt: Date.now() + 7 * 86_400_000,
    });
    expect(response.status).toBe(400);
  });
});

describe('mark a whole show', () => {
  it('refuses a show with more than 1,000 aired episodes, writing nothing', async () => {
    seedUser();
    fakeShow({
      id: 7777,
      seasons: [
        { airDate: '2000-01-01', episodes: 600 },
        { airDate: '2012-01-01', episodes: 401 },
      ],
    });
    const response = await request(`/user/${USER_ID}/watched/series/7777`, {
      as: USER_ID,
      body: { watchProvider: null },
      method: 'POST',
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ status: 413 });
    const progress = await request(
      `/user/${USER_ID}/watched/series/7777?view=progress`,
      { as: USER_ID },
    );
    expect(await progress.json()).toEqual([]);
  });

  it('marks a show of exactly 1,000 aired episodes', async () => {
    seedUser();
    fakeShow({
      id: 7778,
      seasons: [
        { airDate: '2000-01-01', episodes: 600 },
        { airDate: '2012-01-01', episodes: 400 },
      ],
    });
    const response = await request(
      `/user/${USER_ID}/watched/series/7778?view=progress`,
      {
        as: USER_ID,
        body: { watchProvider: null },
        method: 'POST',
      },
    );
    expect(response.status).toBe(201);
    expect(((await response.json()) as unknown[]).length).toBe(1000);
  });
});
