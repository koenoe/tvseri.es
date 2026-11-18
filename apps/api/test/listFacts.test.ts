import { BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { preferredImagesPk } from '@/lib/db/preferredImages/keys';

import { db } from './db';
import { fakeShow } from './fixtures/tmdb';
import { episodes, listItem, seedWatched } from './library';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const OWNER = OTHER_USER_ID;
const FINISHED_AT = Date.parse('2026-11-03T21:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
});

// The owner's favourites, newest first: finished (1), watching season 2 (2),
// up to date (3), not started (4)
const setup = () => {
  seedUser();
  seedUser({ id: OWNER });
  fakeShow({
    extra: {
      backdrop_path: '/b1.jpg',
      episode_run_time: [60],
      type: 'Miniseries',
    },
    id: 1,
    seasons: [{ airDate: '2026-01-01', episodes: 6 }],
  });
  fakeShow({
    id: 2,
    seasons: [
      { airDate: '2025-01-01', episodes: 4 },
      { airDate: '2026-10-15', aired: 4, episodes: 8 },
    ],
    specials: { airDate: '2024-12-01', episodes: 2 },
    status: 'Returning Series',
  });
  fakeShow({
    id: 3,
    seasons: [{ airDate: '2026-10-01', aired: 3, episodes: 6 }],
    status: 'Returning Series',
  });
  fakeShow({ id: 4, seasons: [{ airDate: '2020-01-01', episodes: 3 }] });

  db.seed('Lists', [
    ...[1, 2, 3, 4].map((id) => listItem(OWNER, 'FAVORITES', id, 100 - id)),
    listItem(OWNER, 'WATCHED', 1, FINISHED_AT),
    listItem(OWNER, 'IN_PROGRESS', 2, 50),
    listItem(OWNER, 'IN_PROGRESS', 3, 40),
  ]);
  // Show 2: season 1, then S02E01 last; show 3: every aired episode
  seedWatched(OWNER, 2, [...episodes(1, 1, 4), [2, 1]]);
  seedWatched(OWNER, 3, episodes(1, 1, 3));
};

const favourites = (query = '') =>
  request(`/user/${OWNER}/list/favorites${query}`, { as: USER_ID });

type Item = Readonly<{ id: number; facts?: Record<string, unknown> | null }>;

describe('?include=facts on list reads (Favourites accordion)', () => {
  it("adds each show's facts and the list owner's progress", async () => {
    setup();

    const response = await favourites('?include=facts&limit=5');

    expect(response.status).toBe(200);
    const { items } = (await response.json()) as { items: Item[] };
    expect(items.map((item) => [item.id, item.facts])).toEqual([
      [
        1,
        {
          backdropImage: expect.stringContaining('/b1.jpg'),
          progress: { finishedAt: FINISHED_AT, state: 'finished' },
          seasonCount: 1,
          status: 'Ended',
          totalRuntime: 360,
          type: 'Miniseries',
        },
      ],
      [
        2,
        expect.objectContaining({
          backdropImage: '',
          progress: { season: 2, state: 'watching' },
          seasonCount: 2,
          status: 'Returning Series',
          totalRuntime: null,
          type: null,
        }),
      ],
      [3, expect.objectContaining({ progress: { state: 'up-to-date' } })],
      [4, expect.objectContaining({ progress: { state: 'none' } })],
    ]);
  });

  it('reads the in-progress shows’ summaries in one batch read', async () => {
    setup();
    db.calls.length = 0;

    await favourites('?include=facts&limit=5');

    const summaryReads = db.calls.filter(
      (command) =>
        command instanceof BatchGetItemCommand &&
        JSON.stringify(command.input).includes('AGG#'),
    );
    expect(summaryReads).toHaveLength(1);
  });

  it('names no progress for a show the owner hid from the overview (Paused: Hide)', async () => {
    setup();
    const prefs = (seriesId: number, paused: 'hide' | 'keep') => ({
      paused,
      pausedAt: 1,
      pk: `USER#${OWNER}`,
      seriesId,
      sk: `PREF#SERIES#${seriesId}`,
    });
    db.seed('Lists', [prefs(2, 'keep'), prefs(3, 'hide')]);

    const { items } = (await (
      await favourites('?include=facts&limit=5')
    ).json()) as { items: Item[] };

    expect(items.map((item) => [item.id, item.facts?.progress])).toEqual([
      [1, { finishedAt: FINISHED_AT, state: 'finished' }],
      // Keep: still being watched
      [2, { season: 2, state: 'watching' }],
      // Hide: the overview leaves it out everywhere, so no "Up to date"
      [3, { state: 'none' }],
      [4, { state: 'none' }],
    ]);
  });

  it('leaves the response as it was without the param', async () => {
    setup();

    const { items } = (await (await favourites('?limit=5')).json()) as {
      items: Item[];
    };

    expect(items).toHaveLength(4);
    expect(items.every((item) => !('facts' in item))).toBe(true);
  });

  it('is null for a show TMDB does not know', async () => {
    setup();
    db.seed('Lists', [listItem(OWNER, 'FAVORITES', 9, 1000)]);

    const { items } = (await (
      await favourites('?include=facts&limit=1')
    ).json()) as { items: Item[] };

    expect(items).toEqual([expect.objectContaining({ facts: null, id: 9 })]);
  });

  it('takes at most 24 items with facts (the UI pages are 5 and 20)', async () => {
    setup();

    expect((await favourites('?include=facts&limit=24')).status).toBe(200);
    expect((await favourites('?include=facts')).status).toBe(200);
    expect((await favourites('?include=facts&limit=25')).status).toBe(400);
    expect((await favourites('?include=facts&limit=100')).status).toBe(400);
    // Without facts the page stays up to 100
    expect((await favourites('?limit=100')).status).toBe(200);
  });

  describe("the backdrop: the admin's pick, else TMDB's", () => {
    const pick = (seriesId: number, path: string) => ({
      backdropColor: '#112233',
      backdropImagePath: path,
      pk: preferredImagesPk(seriesId),
    });
    const backdrops = async () => {
      const { items } = (await (
        await favourites('?include=facts&limit=5')
      ).json()) as { items: Item[] };
      return items.map((item) => [item.id, item.facts?.backdropImage]);
    };

    it('reads the pick after the cached facts, so a new pick shows at once', async () => {
      setup();
      // The facts are cached by this first read, before any pick is saved
      expect((await backdrops())[0]).toEqual([
        1,
        expect.stringContaining('/b1.jpg'),
      ]);
      db.seed('PreferredImages', [
        pick(1, '/picked1.jpg'),
        pick(2, '/picked2.jpg'),
      ]);

      expect(await backdrops()).toEqual([
        [1, expect.stringContaining('/picked1.jpg')],
        // TMDB has no backdrop for show 2: the pick still draws it
        [2, expect.stringContaining('/picked2.jpg')],
        [3, ''],
        [4, ''],
      ]);
    });

    it('reads every pick of the page in one batch read', async () => {
      setup();
      db.calls.length = 0;

      await backdrops();

      const pickReads = db.calls.filter(
        (command) =>
          command instanceof BatchGetItemCommand &&
          'PreferredImages' in (command.input.RequestItems ?? {}),
      );
      expect(pickReads).toHaveLength(1);
    });

    it("keeps TMDB's backdrop when the picks can't be read", async () => {
      setup();
      db.seed('PreferredImages', [pick(1, '/picked1.jpg')]);
      const send = db.send.bind(db);
      const spy = vi.spyOn(db, 'send').mockImplementation(async (command) => {
        if (
          command instanceof BatchGetItemCommand &&
          'PreferredImages' in (command.input.RequestItems ?? {})
        ) {
          throw new Error('throttled');
        }
        return send(command);
      });
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect((await backdrops())[0]).toEqual([
        1,
        expect.stringContaining('/b1.jpg'),
      ]);
      spy.mockRestore();
    });
  });

  it('refuses an unknown include', async () => {
    setup();

    expect((await favourites('?include=everything')).status).toBe(400);
  });
});
