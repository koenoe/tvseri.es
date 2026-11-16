import type { Context, SQSEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { handler as undoImportHandler } from '@/lambdas/undoImport';
import { handler } from '@/lambdas/watched';
import { db, sqsMessages } from './db';
import { fakeShow } from './fixtures/tmdb';
import { listItem, seedLibrary } from './library';
import { request } from './request';
import { seedUser, USER_ID } from './seed';
import { listItems, recordWrites, streamEvent, withStream } from './stream';

// The subscriber keeps TMDB series in a module cache: one id per test
let nextShow = 7100;
const newShow = (episodes = 3) => {
  nextShow += 1;
  fakeShow({ id: nextShow, seasons: [{ airDate: '2020-01-01', episodes }] });
  return nextShow;
};

const JAN_2025 = Date.UTC(2025, 0, 1);
const day = (n: number) => JAN_2025 + n * 86_400_000;

const episodePath = (show: number, episode: number) =>
  `/user/${USER_ID}/watched/series/${show}/season/1/episode/${episode}`;

const mark = async (show: number, episode: number, watchedAt: number) => {
  const response = await request(episodePath(show, episode), {
    as: USER_ID,
    body: { watchedAt, watchProvider: null },
    method: 'POST',
  });
  expect(response.status).toBe(201);
};

const unmark = async (show: number, episode: number) => {
  const response = await request(episodePath(show, episode), {
    as: USER_ID,
    method: 'DELETE',
  });
  expect(response.status).toBe(200);
};

const row = (show: number, episodeNumber: number, watchedAt: number) => ({
  episode: {
    airDate: '2020-01-01T00:00:00.000Z',
    episodeNumber,
    runtime: 30,
    seasonNumber: 1,
    stillPath: null,
    title: `Episode ${episodeNumber}`,
  },
  tvSeries: {
    id: show,
    posterPath: `/poster-${show}.jpg`,
    slug: `show-${show}`,
    title: `Show ${show}`,
  },
  watchedAt,
});

const runImport = async (rows: ReadonlyArray<ReturnType<typeof row>>) => {
  const started = await request('/me/imports', { as: USER_ID, method: 'POST' });
  const { importId } = (await started.json()) as { importId: string };
  const response = await request(`/me/imports/${importId}/batch`, {
    as: USER_ID,
    body: rows,
    method: 'POST',
  });
  expect(response.status).toBe(201);
  return importId;
};

const undoImport = async (importId: string) => {
  const response = await request(`/me/imports/${importId}`, {
    as: USER_ID,
    method: 'DELETE',
  });
  expect(response.status).toBe(202);
  const messages = sqsMessages
    .splice(0)
    .filter(({ queueUrl }) => queueUrl === 'https://sqs.test/undo-import');
  const event = {
    Records: messages.map((message, index) => ({
      body: JSON.stringify(message.body),
      messageId: `m${index}`,
    })),
  } as unknown as SQSEvent;
  const context = {
    getRemainingTimeInMillis: () => 300_000,
  } as unknown as Context;
  expect(await undoImportHandler(event, context, () => {})).toEqual({
    batchItemFailures: [],
  });
};

const item = (sk: string) =>
  listItems(USER_ID).find((candidate) => candidate.sk === sk);
const watchlistItem = (show: number) => item(`LIST#WATCHLIST#ITEM#${show}`);
const inProgressItem = (show: number) => item(`LIST#IN_PROGRESS#ITEM#${show}`);
const watchedListItem = (show: number) => item(`LIST#WATCHED#ITEM#${show}`);
const parkedItem = (show: number) => item(`PARKED#WATCHLIST#${show}`);

const libraryIds = async () =>
  (await request('/me/library-ids', { as: USER_ID })).json();

const watchlistOrder = async () => {
  const response = await request(`/user/${USER_ID}/list/watchlist`, {
    as: USER_ID,
  });
  const body = (await response.json()) as { items: { id: number }[] };
  return body.items.map(({ id }) => id);
};

/** A watchlist item as the API writes it, added on `day(-30)` */
const seedWatchlist = (show: number, createdAt = day(-30)) => {
  const original = listItem(USER_ID, 'WATCHLIST', show, createdAt);
  db.seed('Lists', [original]);
  return original;
};

describe('watchlist entries come back when nothing is watched any more', () => {
  it('watchlist -> mark -> unmark: back with its original time and place', async () => {
    seedUser();
    const show = newShow();
    // Its neighbours on the watchlist: one added before, one after
    db.seed('Lists', [
      listItem(USER_ID, 'WATCHLIST', 1, day(-40)),
      listItem(USER_ID, 'WATCHLIST', 2, day(-20)),
    ]);
    const original = seedWatchlist(show);
    expect(await watchlistOrder()).toEqual([2, show, 1]);

    await withStream(() => mark(show, 1, day(1)));
    expect(await libraryIds()).toMatchObject({
      inProgress: [show],
      watchlist: [1, 2],
    });
    expect(parkedItem(show)).toMatchObject({ item: original });
    // Parked entries are invisible to every list read and index
    expect(await watchlistOrder()).toEqual([2, 1]);
    expect(parkedItem(show)).not.toHaveProperty('gsi2pk');

    await withStream(() => unmark(show, 1));
    expect(watchlistItem(show)).toEqual(original);
    expect(parkedItem(show)).toBeUndefined();
    expect(await watchlistOrder()).toEqual([2, show, 1]);
    expect(await libraryIds()).toMatchObject({ inProgress: [], watched: [] });
  });

  it('watchlist -> import -> Undo import: back as it was', async () => {
    seedUser();
    const show = newShow();
    const original = seedWatchlist(show);

    let importId = '';
    await withStream(async () => {
      importId = await runImport([row(show, 1, day(1)), row(show, 2, day(2))]);
    });
    expect(watchlistItem(show)).toBeUndefined();
    expect(inProgressItem(show)).toMatchObject({ createdAt: day(2) });

    await withStream(() => undoImport(importId));
    expect(watchlistItem(show)).toEqual(original);
    expect(inProgressItem(show)).toBeUndefined();
    expect(parkedItem(show)).toBeUndefined();
  });

  it('watchlist -> mark -> finish: stays off the watchlist', async () => {
    seedUser();
    const show = newShow(2);
    const original = seedWatchlist(show);

    await withStream(() => mark(show, 1, day(1)));
    await withStream(() => mark(show, 2, day(2)));
    expect(await libraryIds()).toMatchObject({
      inProgress: [],
      watched: [show],
      watchlist: [],
    });
    expect(watchedListItem(show)).toMatchObject({ createdAt: day(2) });

    // Unmarking one episode of a finished show: In progress, not watchlist
    await withStream(() => unmark(show, 2));
    expect(await libraryIds()).toMatchObject({
      inProgress: [show],
      watched: [],
      watchlist: [],
    });

    // Only when nothing is watched any more (an Undo of a whole-show mark)
    await withStream(() => unmark(show, 1));
    expect(watchlistItem(show)).toEqual(original);
  });

  it('a show that was never on the watchlist never appears on it', async () => {
    seedUser();
    const show = newShow();
    await withStream(() => mark(show, 1, day(1)));
    await withStream(() => unmark(show, 1));
    expect(await libraryIds()).toMatchObject({
      inProgress: [],
      watched: [],
      watchlist: [],
    });
    expect(listItems(USER_ID)).toEqual([]);
  });

  it('two imports over the same show: undoing the second keeps the first', async () => {
    seedUser();
    const show = newShow(4);
    const original = seedWatchlist(show);

    await withStream(() => runImport([row(show, 1, day(1))]));
    let second = '';
    await withStream(async () => {
      // E01 again (skipped, already watched) and E02
      second = await runImport([row(show, 1, day(5)), row(show, 2, day(6))]);
    });
    expect(inProgressItem(show)).toMatchObject({ createdAt: day(6) });

    await withStream(() => undoImport(second));
    expect(await libraryIds()).toMatchObject({
      inProgress: [show],
      watchlist: [],
    });
    expect(inProgressItem(show)).toMatchObject({ createdAt: day(1) });
    expect(parkedItem(show)).toMatchObject({ item: original });

    // The first import's episode unmarked by hand: nothing left
    await withStream(() => unmark(show, 1));
    expect(watchlistItem(show)).toEqual(original);
  });

  it('taken off the watchlist by hand: never comes back', async () => {
    seedUser();
    const show = newShow();
    seedWatchlist(show);
    await withStream(() => mark(show, 1, day(1)));

    // Added again while watching, then removed by hand
    await request(`/user/${USER_ID}/list/watchlist`, {
      as: USER_ID,
      body: { id: show, posterPath: null, slug: 's', title: 'S' },
      method: 'POST',
    });
    const removed = await request(`/user/${USER_ID}/list/watchlist/${show}`, {
      as: USER_ID,
      method: 'DELETE',
    });
    expect(removed.status).toBe(200);
    expect(parkedItem(show)).toBeUndefined();

    await withStream(() => unmark(show, 1));
    expect(watchlistItem(show)).toBeUndefined();
  });

  it('a newer watchlist entry added by hand wins over the parked one', async () => {
    seedUser();
    const show = newShow();
    seedWatchlist(show);
    await withStream(() => mark(show, 1, day(1)));
    const readded = listItem(USER_ID, 'WATCHLIST', show, day(3));
    db.seed('Lists', [readded]);

    await withStream(() => unmark(show, 1));
    expect(watchlistItem(show)).toEqual(readded);
    expect(parkedItem(show)).toBeUndefined();
  });

  it('existing data without a parked entry keeps today’s behaviour', async () => {
    seedUser();
    const show = newShow();
    // In progress from before parking existed: no parked entry anywhere
    seedLibrary(USER_ID, { IN_PROGRESS: [show] });
    await withStream(() => mark(show, 1, day(1)));
    await withStream(() => unmark(show, 1));
    expect(listItems(USER_ID)).toEqual([]);
  });
});

describe('a show leaving Finished leaves RESUMING_SOON too', () => {
  it('after an Undo import or an unmark, nothing is left in RESUMING_SOON', async () => {
    seedUser();
    const show = newShow(2);
    let importId = '';
    await withStream(async () => {
      importId = await runImport([row(show, 1, day(1)), row(show, 2, day(2))]);
    });
    expect(watchedListItem(show)).toBeDefined();
    // The nightly job: new episodes are close
    db.seed('Lists', [listItem(USER_ID, 'RESUMING_SOON', show, day(3))]);

    await withStream(() => undoImport(importId));
    expect(listItems(USER_ID)).toEqual([]);

    // The same for an unmark that leaves the show In progress
    await withStream(async () => {
      await mark(show, 1, day(5));
      await mark(show, 2, day(6));
    });
    db.seed('Lists', [listItem(USER_ID, 'RESUMING_SOON', show, day(7))]);
    await withStream(() => unmark(show, 2));
    expect(item(`LIST#RESUMING_SOON#ITEM#${show}`)).toBeUndefined();
    expect(inProgressItem(show)).toBeDefined();
  });
});

describe('In progress keeps its order on an unmark or Undo import', () => {
  it('an unmark moves a show to its latest remaining watch, not to the top', async () => {
    seedUser();
    const show = newShow(4);
    await withStream(async () => {
      await mark(show, 1, day(1));
      await mark(show, 2, day(2));
      await mark(show, 3, day(3));
    });
    expect(inProgressItem(show)).toMatchObject({
      createdAt: day(3),
      gsi2sk: day(3),
    });

    await withStream(() => unmark(show, 3));
    expect(inProgressItem(show)).toMatchObject({
      createdAt: day(2),
      gsi2sk: day(2),
    });

    // Unmarking an older one leaves the time where it is
    await withStream(() => unmark(show, 1));
    expect(inProgressItem(show)).toMatchObject({ createdAt: day(2) });
  });

  it('Undo import puts every In progress show back where it was', async () => {
    seedUser();
    const [a, b, c] = [newShow(5), newShow(5), newShow(5)];
    await withStream(async () => {
      await mark(a, 1, day(3));
      await mark(b, 1, day(2));
      await mark(c, 1, day(1));
    });
    const before = listItems(USER_ID);

    let importId = '';
    await withStream(async () => {
      importId = await runImport([
        row(c, 2, day(10)),
        row(b, 2, day(11)),
        row(a, 2, day(12)),
      ]);
    });
    expect(inProgressItem(a)).toMatchObject({ createdAt: day(12) });

    await withStream(() => undoImport(importId));
    expect(listItems(USER_ID)).toEqual(before);
  });

  it('gives the same lists whatever the record order and batching', async () => {
    seedUser();
    const [a, b] = [newShow(3), newShow(3)];
    const records = await recordWrites(async () => {
      await mark(a, 1, day(5));
      await mark(a, 2, day(1));
      await mark(b, 1, day(2));
      await mark(b, 2, day(7));
    });

    await handler(streamEvent(records));
    const inOrder = listItems(USER_ID);

    for (const listItemRow of listItems(USER_ID)) {
      db.table('Lists').delete(listItemRow);
    }
    await handler(streamEvent([...records].reverse()));
    expect(listItems(USER_ID)).toEqual(inOrder);

    for (const listItemRow of listItems(USER_ID)) {
      db.table('Lists').delete(listItemRow);
    }
    for (const record of records) {
      await handler(streamEvent([record]));
    }
    expect(listItems(USER_ID)).toEqual(inOrder);
    expect(inProgressItem(a)).toMatchObject({ createdAt: day(5) });
    expect(inProgressItem(b)).toMatchObject({ createdAt: day(7) });
  });

  it('a redelivered batch gives the same result (at-least-once)', async () => {
    seedUser();
    const show = newShow(3);
    seedWatchlist(show);
    const markRecords = await recordWrites(async () => {
      await mark(show, 1, day(1));
      await mark(show, 2, day(2));
    });
    await handler(streamEvent(markRecords));
    const once = listItems(USER_ID);
    await handler(streamEvent(markRecords));
    expect(listItems(USER_ID)).toEqual(once);

    const unmarkRecords = await recordWrites(() => unmark(show, 2));
    await handler(streamEvent(unmarkRecords));
    const afterUnmark = listItems(USER_ID);
    // The older mark batch delivered again after the unmark: still the
    // current state, not the state of that batch
    await handler(streamEvent(markRecords));
    await handler(streamEvent(unmarkRecords));
    expect(listItems(USER_ID)).toEqual(afterUnmark);
    expect(inProgressItem(show)).toMatchObject({ createdAt: day(1) });
  });

  it('a special counts as watching the show', async () => {
    seedUser();
    nextShow += 1;
    const show = nextShow;
    fakeShow({
      id: show,
      seasons: [{ airDate: '2020-01-01', episodes: 3 }],
      specials: { airDate: '2020-06-01', episodes: 1 },
    });
    await withStream(async () => {
      await mark(show, 1, day(1));
      const special = await request(
        `/user/${USER_ID}/watched/series/${show}/season/0/episode/1`,
        {
          as: USER_ID,
          body: { watchedAt: day(4), watchProvider: null },
          method: 'POST',
        },
      );
      expect(special.status).toBe(201);
    });
    expect(inProgressItem(show)).toMatchObject({ createdAt: day(4) });
  });
});
