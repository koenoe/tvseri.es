import { describe, expect, it, vi } from 'vitest';

import { MARK_SYNC_MS } from '@/lib/listSync';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { db } from './db';
import { timeToSettle } from './fakeClock';
import {
  onTmdb,
  requestedUrls,
  resetRequests,
  setUpstreamConditions,
} from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { listItem } from './library';
import { markEpisode } from './markEpisode';
import { request } from './request';
import { seedUser, USER_ID } from './seed';
import { listItems, withStream } from './stream';

// The stream keeps TMDB series in a module cache: one id per test
let nextShow = 9100;
const newShow = (episodes = 3) => {
  nextShow += 1;
  fakeShow({ id: nextShow, seasons: [{ airDate: '2020-01-01', episodes }] });
  return nextShow;
};

const mark = async (
  show: number,
  episode: number,
  watchedAt = Date.UTC(2025, 0, episode),
) => markEpisode({ episode, show, watchedAt });

const batchRow = (show: number) => ({
  episode: {
    airDate: '2020-01-01',
    episodeNumber: 1,
    runtime: 30,
    seasonNumber: 1,
    stillPath: null,
    title: 'E1',
  },
  tvSeries: { id: show, posterPath: '/p.jpg', slug: 's', title: 'S' },
  userId: USER_ID,
  watchedAt: Date.UTC(2025, 0, 1),
});

const lists = () => listItems(USER_ID).map((item) => String(item.sk));

describe('In progress, Finished and the watchlist are updated inside the mark', () => {
  it('a mark places the show before the stream has run', async () => {
    seedUser();
    const show = newShow();

    expect((await mark(show, 1)).status).toBe(201);
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });

  it('the last episode finishes it; an unmark of everything clears it and brings the watchlist entry back', async () => {
    seedUser();
    const show = newShow(2);
    const original = listItem(USER_ID, 'WATCHLIST', show, 5);
    db.seed('Lists', [original]);

    await mark(show, 1);
    expect(lists()).toEqual([
      `LIST#IN_PROGRESS#ITEM#${show}`,
      `PARKED#WATCHLIST#${show}`,
    ]);
    await mark(show, 2);
    expect(lists()).toContain(`LIST#WATCHED#ITEM#${show}`);

    const unmark = await request(`/user/${USER_ID}/watched/series/${show}`, {
      as: USER_ID,
      method: 'DELETE',
    });
    expect(unmark.status).toBe(200);
    expect(lists()).toEqual([`LIST#WATCHLIST#ITEM#${show}`]);
  });

  it('the stream running after it gives the same lists (both are safe together)', async () => {
    seedUser();
    const show = newShow();

    await withStream(() => mark(show, 1));
    await withStream(() => mark(show, 2));
    await withStream(() => mark(show, 3));

    expect(listItems(USER_ID)).toEqual([
      expect.objectContaining({
        createdAt: Date.UTC(2025, 0, 3),
        sk: `LIST#WATCHED#ITEM#${show}`,
      }),
    ]);
  });

  it('a batch mark places every show in it', async () => {
    seedUser();
    const a = newShow();
    const b = newShow();
    const row = (show: number) => ({
      episode: {
        airDate: '2020-01-01',
        episodeNumber: 1,
        runtime: 30,
        seasonNumber: 1,
        stillPath: null,
        title: 'E1',
      },
      tvSeries: {
        id: show,
        posterPath: '/p.jpg',
        slug: `s-${show}`,
        title: `S ${show}`,
      },
      userId: USER_ID,
      watchedAt: Date.UTC(2025, 0, 1),
    });

    const response = await request(`/user/${USER_ID}/watched/batch`, {
      as: USER_ID,
      body: [row(a), row(b)],
      method: 'POST',
    });

    expect(response.status).toBe(201);
    expect(lists()).toEqual([
      `LIST#IN_PROGRESS#ITEM#${a}`,
      `LIST#IN_PROGRESS#ITEM#${b}`,
    ]);
  });

  it('uses the stored show facts when TMDB fails, and never fails the mark', async () => {
    seedUser();
    const show = newShow();
    await getSeriesFacts([show]);
    const row = {
      episode: {
        airDate: '2020-01-01',
        episodeNumber: 1,
        runtime: 30,
        seasonNumber: 1,
        stillPath: null,
        title: 'E1',
      },
      tvSeries: { id: show, posterPath: '/p.jpg', slug: 's', title: 'S' },
      userId: USER_ID,
      watchedAt: Date.UTC(2025, 0, 1),
    };
    onTmdb(`/tv/${show}`, {}, { status: 500 });
    const failing = newShow();
    onTmdb(`/tv/${failing}`, {}, { status: 500 });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(`/user/${USER_ID}/watched/batch`, {
      as: USER_ID,
      body: [row, { ...row, tvSeries: { ...row.tvSeries, id: failing } }],
      method: 'POST',
    });

    expect(response.status).toBe(201);
    // the show with stored facts is placed; the unknown one waits for the stream
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
    warn.mockRestore();
  });

  it('places from stored facts without asking TMDB, and answers fast while TMDB stalls', async () => {
    seedUser();
    const stored = newShow();
    await getSeriesFacts([stored]);
    const cold = newShow();
    resetRequests();
    setUpstreamConditions({ outage: 'hang' });

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    // Long enough for the hanging TMDB calls to time out and end in this test
    const { ms, value: response } = await timeToSettle(
      () =>
        request(`/user/${USER_ID}/watched/batch`, {
          as: USER_ID,
          body: [batchRow(stored), batchRow(cold)],
          method: 'POST',
        }),
      20_000,
    );

    expect(response.status).toBe(201);
    // Inside the 2.5 s bound, though TMDB never answers
    expect(ms).toBeLessThanOrEqual(MARK_SYNC_MS);
    // The show with stored facts is placed without TMDB; the cold one is
    // left to the stream
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${stored}`]);
    expect(
      requestedUrls().filter((url) => url.pathname === `/3/tv/${stored}`),
    ).toHaveLength(0);
  });

  it('a failed summary write still places the show', async () => {
    seedUser();
    const show = newShow();
    const send = db.send.bind(db);
    const spy = vi.spyOn(db, 'send').mockImplementation(async (command) => {
      const item = (command.input as { Item?: { sk?: { S?: string } } }).Item;
      if (item?.sk?.S?.startsWith('AGG#SHOW#')) {
        throw new Error('throttled');
      }
      return send(command);
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect((await mark(show, 1)).status).toBe(201);
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
    spy.mockRestore();
  });
});
