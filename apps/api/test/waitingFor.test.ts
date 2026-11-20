import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const listItem = (
  userId: string,
  list: string,
  id: number,
  createdAt: number,
) => ({
  createdAt,
  gsi1pk: `LIST#${userId}#${list}`,
  gsi1sk: `show ${id}`,
  gsi2pk: `LIST#${userId}#${list}`,
  gsi2sk: createdAt,
  id,
  pk: `USER#${userId}`,
  posterPath: `/p${id}.jpg`,
  sk: `LIST#${list}#ITEM#${id}`,
  slug: `show-${id}`,
  title: `Show ${id}`,
});

const episode = (season: number, number: number, airDate: string) => ({
  air_date: airDate,
  episode_number: number,
  id: season * 100 + number,
  name: 'E',
  season_number: season,
});

const APR_16 = Date.parse('2026-04-16T10:00:00Z');
const OCT_30 = Date.parse('2026-10-30T10:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
});

describe('resuming_soon list routes', () => {
  it('reads the RESUMING_SOON list and its count', async () => {
    seedUser();
    db.seed('Lists', [listItem(USER_ID, 'RESUMING_SOON', 11, APR_16)]);

    const list = await request(`/user/${USER_ID}/list/resuming_soon`, {
      as: USER_ID,
    });
    const count = await request(`/user/${USER_ID}/list/resuming_soon/count`, {
      as: USER_ID,
    });

    expect(list.status).toBe(200);
    expect(
      ((await list.json()) as { items: Array<{ id: number }> }).items.map(
        (item) => item.id,
      ),
    ).toEqual([11]);
    expect(await count.json()).toEqual({ count: 1 });
  });
});

describe('waiting for', () => {
  const setup = () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID });
    // Dated next season
    fakeShow({
      extra: {
        last_episode_to_air: episode(2, 8, '2025-06-01'),
        next_episode_to_air: episode(3, 1, '2027-01-07'),
      },
      id: 1,
      seasons: [
        { airDate: '2024-01-01', episodes: 8 },
        { airDate: '2025-04-01', episodes: 8 },
        { airDate: '2027-01-07', aired: 0, episodes: 8 },
      ],
      status: 'Returning Series',
    });
    // Renewed, no date yet
    fakeShow({
      extra: { next_episode_to_air: null },
      id: 2,
      seasons: [
        { airDate: '2024-01-01', episodes: 8 },
        { airDate: '2025-04-01', episodes: 8 },
      ],
      status: 'Returning Series',
    });
    // Ended and cancelled
    fakeShow({
      id: 3,
      seasons: [{ airDate: '2020-01-01', episodes: 8 }],
      status: 'Ended',
    });
    fakeShow({
      id: 4,
      seasons: [{ airDate: '2020-01-01', episodes: 8 }],
      status: 'Canceled',
    });
    // Back in 5 days (the daily job put it in RESUMING_SOON)
    fakeShow({
      extra: {
        last_episode_to_air: episode(1, 8, '2025-06-01'),
        next_episode_to_air: episode(2, 1, '2026-11-17'),
      },
      id: 5,
      seasons: [
        { airDate: '2025-04-01', episodes: 8 },
        { airDate: '2026-11-17', aired: 0, episodes: 8 },
      ],
      status: 'Returning Series',
    });
    // Caught up mid-season, its finale in 2 days
    fakeShow({
      extra: {
        last_episode_to_air: episode(1, 7, '2026-11-07'),
        next_episode_to_air: episode(1, 8, '2026-11-14'),
      },
      id: 7,
      seasons: [{ airDate: '2026-09-26', aired: 7, episodes: 8 }],
      status: 'Returning Series',
    });
    db.seed('Lists', [
      listItem(USER_ID, 'WATCHED', 1, APR_16),
      listItem(USER_ID, 'WATCHED', 7, OCT_30),
      listItem(USER_ID, 'WATCHED', 2, OCT_30),
      listItem(USER_ID, 'WATCHED', 3, OCT_30),
      listItem(USER_ID, 'WATCHED', 4, OCT_30),
      listItem(USER_ID, 'WATCHED', 5, OCT_30),
      listItem(USER_ID, 'RESUMING_SOON', 5, OCT_30),
      listItem(USER_ID, 'IN_PROGRESS', 6, OCT_30),
      listItem(OTHER_USER_ID, 'WATCHED', 2, OCT_30),
    ]);
  };

  /** The full overview's finished shows coming back (computed once per profile view) */
  const waitingFor = async () => {
    const overview = await request('/me/overview', { as: USER_ID });
    expect(overview.status).toBe(200);
    expect(overview.headers.get('cache-control')).toBe('private, no-store');
    return ((await overview.json()) as { waitingFor: unknown }).waitingFor;
  };

  it('is left out of Up next only (Home)', async () => {
    setup();
    const upNext = (await (
      await request('/me/overview?view=up-next', { as: USER_ID })
    ).json()) as Record<string, unknown>;
    expect(upNext).not.toHaveProperty('waitingFor');
  });

  it('labels each finished, returning show: date, countdown, renewed', async () => {
    setup();

    // Show 5 is back in 5 days: a Coming up ticket, so not here as well
    expect(await waitingFor()).toEqual({
      items: [
        {
          daysToGo: 56,
          finishedAt: APR_16,
          nextDate: '2027-01-07',
          nextEpisode: 1,
          nextKind: 'season-premiere',
          nextSeason: 3,
          posterImage: expect.stringContaining('/p1.jpg'),
          seriesId: 1,
          slug: 'show-1',
          state: 'dated',
          title: 'Show 1',
        },
        {
          finishedAt: OCT_30,
          // Season 2's last, a week apart from Apr 1
          lastAired: '2025-05-20',
          nextSeason: 3,
          posterImage: expect.stringContaining('/p2.jpg'),
          seriesId: 2,
          slug: 'show-2',
          state: 'renewed',
          title: 'Show 2',
        },
      ],
    });
  });

  it('hands a return within 30 days to Coming up instead, with when you finished it', async () => {
    setup();
    const overview = (await (
      await request('/me/overview', { as: USER_ID })
    ).json()) as {
      comingUp: ReadonlyArray<{ finishedAt?: number; seriesId: number }>;
    };

    // the ticket's "Back after N months" needs it
    expect(
      overview.comingUp.find((ticket) => ticket.seriesId === 5),
    ).toMatchObject({ finishedAt: OCT_30 });
  });

  it('keeps a returning show’s premiere or finale on its Coming up ticket', async () => {
    setup();
    const overview = (await (
      await request('/me/overview', { as: USER_ID })
    ).json()) as {
      comingUp: ReadonlyArray<{ kind: string; seriesId: number }>;
    };
    const kindOf = (id: number) =>
      overview.comingUp.find((ticket) => ticket.seriesId === id)?.kind;

    expect(kindOf(5)).toBe('season-premiere');
    expect(kindOf(7)).toBe('season-finale');
  });

  it('keeps a cancelled show whose last episodes still air: its next one is a Coming up ticket', async () => {
    seedUser();
    // Cancelled while season 2 airs: caught up at E5, E6 next week
    fakeShow({
      extra: {
        last_episode_to_air: episode(2, 5, '2026-11-12'),
        next_episode_to_air: episode(2, 6, '2026-11-19'),
      },
      id: 8,
      seasons: [
        { airDate: '2024-01-01', episodes: 8 },
        { airDate: '2026-10-15', aired: 5, episodes: 8 },
      ],
      status: 'Canceled',
    });
    db.seed('Lists', [listItem(USER_ID, 'WATCHED', 8, OCT_30)]);

    const overview = (await (
      await request('/me/overview', { as: USER_ID })
    ).json()) as {
      comingUp: ReadonlyArray<{ seriesId: number }>;
    };

    expect(overview.comingUp.map((ticket) => ticket.seriesId)).toContain(8);
  });

  it('is empty when nothing is finished', async () => {
    seedUser();

    expect(await waitingFor()).toEqual({ items: [] });
  });

  it('needs a signed-in viewer', async () => {
    const response = await request('/me/overview');

    expect(response.status).toBe(401);
  });
});
