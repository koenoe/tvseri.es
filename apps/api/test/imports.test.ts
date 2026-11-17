import type { Context, SQSEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { handler as undoImport } from '@/lambdas/undoImport';
import { db, sqsMessages } from './db';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const SHOW = 1396;
const JAN_2020 = Date.UTC(2020, 0, 1);
const MAY_2024 = Date.UTC(2024, 4, 1);

const row = (seasonNumber: number, episodeNumber: number, extra = {}) => ({
  episode: {
    airDate: '2008-01-20T00:00:00.000Z',
    episodeNumber,
    runtime: 47,
    seasonNumber,
    stillPath: null,
    title: `Episode ${episodeNumber}`,
  },
  tvSeries: {
    id: SHOW,
    posterPath: '/bb.jpg',
    slug: 'breaking-bad',
    title: 'Breaking Bad',
  },
  watchedAt: MAY_2024,
  ...extra,
});

/** Marks episodes the normal way (before or after an import) */
const markBefore = async (
  episodes: ReadonlyArray<number>,
  watchedAt: number,
) => {
  const response = await request(`/user/${USER_ID}/watched/batch`, {
    as: USER_ID,
    body: episodes.map((episode) => ({
      ...row(1, episode),
      userId: USER_ID,
      watchedAt,
    })),
    method: 'POST',
  });
  expect(response.status).toBe(201);
};

const episodes = async () => {
  const response = await request(`/user/${USER_ID}/watched/series/${SHOW}`, {
    as: USER_ID,
  });
  return (
    (await response.json()) as Array<{
      episodeNumber: number;
      watchedAt: number;
    }>
  )
    .map(({ episodeNumber, watchedAt }) => ({ episodeNumber, watchedAt }))
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
};

const startImport = async () => {
  const response = await request('/me/imports', {
    as: USER_ID,
    method: 'POST',
  });
  expect(response.status).toBe(201);
  return ((await response.json()) as { importId: string }).importId;
};

const lambdaContext = (remainingMs = 300_000) =>
  ({ getRemainingTimeInMillis: () => remainingMs }) as unknown as Context;

const UNDO_QUEUE = 'https://sqs.test/undo-import';

/** Messages sent to the undo-import queue (other queues are ignored) */
const undoMessages = () =>
  sqsMessages.filter((message) => message.queueUrl === UNDO_QUEUE);

const runUndoQueue = async (remainingMs?: number) => {
  const messages = undoMessages();
  sqsMessages.length = 0;
  const event = {
    Records: messages.map((message, index) => ({
      body: JSON.stringify(message.body),
      messageId: `m${index}`,
    })),
  } as unknown as SQSEvent;
  return undoImport(event, lambdaContext(remainingMs), () => {});
};

describe('1 import keeps existing dates', () => {
  it('writes new episodes with the import id and skips ones already watched', async () => {
    seedUser();
    await markBefore([1], JAN_2020);
    const importId = await startImport();

    const response = await request(`/me/imports/${importId}/batch`, {
      as: USER_ID,
      body: [row(1, 1), row(1, 2), row(1, 2)],
      method: 'POST',
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ skipped: 1, written: 1 });

    expect(await episodes()).toEqual([
      { episodeNumber: 1, watchedAt: JAN_2020 },
      { episodeNumber: 2, watchedAt: MAY_2024 },
    ]);
    const me = await request('/me', { as: USER_ID });
    expect(await me.json()).toMatchObject({
      lastImport: { importId, skipped: 1, written: 1 },
    });
  });

  it('refuses batches for an import that is not the last one', async () => {
    seedUser();
    const first = await startImport();
    await startImport();
    const response = await request(`/me/imports/${first}/batch`, {
      as: USER_ID,
      body: [row(1, 1)],
      method: 'POST',
    });
    expect(response.status).toBe(409);
    expect(await episodes()).toEqual([]);
  });
});

describe('2 import check (dry run)', () => {
  it('says what would be written and skipped, writing nothing', async () => {
    seedUser();
    await markBefore([1], JAN_2020);
    const response = await request('/me/imports/check', {
      as: USER_ID,
      body: [row(1, 1), row(1, 2), row(1, 3)],
      method: 'POST',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      alreadyWatched: [{ code: 'S01E01', seriesId: SHOW }],
      skipped: 1,
      written: 2,
    });
    expect(await episodes()).toEqual([
      { episodeNumber: 1, watchedAt: JAN_2020 },
    ]);
  });
});

describe('undo import', () => {
  it('deletes only what the import wrote, in the queue Lambda', async () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID, username: 'other' });
    await markBefore([1], JAN_2020);
    const importId = await startImport();
    await request(`/me/imports/${importId}/batch`, {
      as: USER_ID,
      body: [row(1, 1), row(1, 2), row(1, 3), row(1, 4)],
      method: 'POST',
    });
    // Re-marked after the import: no longer the import's episode
    await markBefore([4], MAY_2024 + 1);

    const undo = await request(`/me/imports/${importId}`, {
      as: USER_ID,
      method: 'DELETE',
    });
    expect(undo.status).toBe(202);
    expect(undoMessages()).toEqual([
      expect.objectContaining({ body: { importId, userId: USER_ID } }),
    ]);

    expect(await runUndoQueue()).toEqual({ batchItemFailures: [] });
    expect(await episodes()).toEqual([
      { episodeNumber: 1, watchedAt: JAN_2020 },
      { episodeNumber: 4, watchedAt: MAY_2024 + 1 },
    ]);
    const me = await request('/me', { as: USER_ID });
    expect((await me.json()).lastImport.undoneAt).toEqual(expect.any(Number));

    // Safe to run again: nothing left to delete
    sqsMessages.push({
      body: { importId, userId: USER_ID },
      queueUrl: UNDO_QUEUE,
    });
    expect(await runUndoQueue()).toEqual({ batchItemFailures: [] });
    expect(await episodes()).toHaveLength(2);
  });

  it('continues in a new message when the Lambda runs out of time', async () => {
    seedUser();
    const importId = await startImport();
    await request(`/me/imports/${importId}/batch`, {
      as: USER_ID,
      body: [row(1, 1), row(1, 2)],
      method: 'POST',
    });
    await request(`/me/imports/${importId}`, { as: USER_ID, method: 'DELETE' });

    await runUndoQueue(1_000);
    expect(undoMessages()).toEqual([
      expect.objectContaining({ body: { importId, userId: USER_ID } }),
    ]);
    await runUndoQueue();
    expect(await episodes()).toEqual([]);
  });

  it("can't undo an import that isn't the user's last one", async () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID, username: 'other' });
    const importId = await startImport();
    const response = await request(`/me/imports/${importId}`, {
      as: OTHER_USER_ID,
      method: 'DELETE',
    });
    expect(response.status).toBe(409);
    expect(undoMessages()).toEqual([]);
    expect(
      db.dump('Users').find((user) => user.id === USER_ID)?.lastImport,
    ).toMatchObject({
      importId,
    });
  });

  it('refuses batches once the import is being undone', async () => {
    seedUser();
    const importId = await startImport();
    await request(`/me/imports/${importId}`, { as: USER_ID, method: 'DELETE' });
    const response = await request(`/me/imports/${importId}/batch`, {
      as: USER_ID,
      body: [row(1, 1)],
      method: 'POST',
    });
    expect(response.status).toBe(409);
  });
});

describe('import and skipped marks', () => {
  const prefsOf = async (userId: string) => {
    const response = await request(`/me/series/${SHOW}/prefs`, { as: userId });
    expect(response.status).toBe(200);
    return ((await response.json()) as { skipped: string[] }).skipped;
  };

  const skip = async (userId: string, codes: ReadonlyArray<string>) => {
    const response = await request(`/me/series/${SHOW}/prefs`, {
      as: userId,
      body: { skip: codes },
      method: 'PATCH',
    });
    expect(response.status).toBe(200);
  };

  const importRows = async (rows: ReadonlyArray<ReturnType<typeof row>>) => {
    const importId = await startImport();
    const response = await request(`/me/imports/${importId}/batch`, {
      as: USER_ID,
      body: rows,
      method: 'POST',
    });
    expect(response.status).toBe(201);
    return importId;
  };

  const undo = async (importId: string) => {
    const response = await request(`/me/imports/${importId}`, {
      as: USER_ID,
      method: 'DELETE',
    });
    expect(response.status).toBe(202);
    expect(await runUndoQueue()).toEqual({ batchItemFailures: [] });
  };

  it('an import clears the skips of the episodes it writes, and Undo puts them back', async () => {
    seedUser();
    await skip(USER_ID, ['S01E02', 'S01E03', 'S02E01']);

    const importId = await importRows([row(1, 1), row(1, 2), row(1, 3)]);
    expect(await prefsOf(USER_ID)).toEqual(['S02E01']);

    await undo(importId);
    expect(await episodes()).toEqual([]);
    expect(await prefsOf(USER_ID)).toEqual(['S01E02', 'S01E03', 'S02E01']);
  });

  it('keeps an episode marked again by hand after the import watched, without its skip', async () => {
    seedUser();
    await skip(USER_ID, ['S01E02', 'S01E03']);
    const importId = await importRows([row(1, 2), row(1, 3)]);
    await markBefore([3], MAY_2024 + 1);

    await undo(importId);
    expect(await episodes()).toEqual([
      { episodeNumber: 3, watchedAt: MAY_2024 + 1 },
    ]);
    expect(await prefsOf(USER_ID)).toEqual(['S01E02']);
  });

  it('is safe to run again once done', async () => {
    seedUser();
    await skip(USER_ID, ['S01E02']);
    const importId = await importRows([row(1, 2)]);
    expect(await prefsOf(USER_ID)).toEqual([]);

    await undo(importId);
    expect(await prefsOf(USER_ID)).toEqual(['S01E02']);

    // The user un-skips it again; a redelivered message changes nothing
    await request(`/me/series/${SHOW}/prefs`, {
      as: USER_ID,
      body: { unskip: ['S01E02'] },
      method: 'PATCH',
    });
    sqsMessages.push({
      body: { importId, userId: USER_ID },
      queueUrl: UNDO_QUEUE,
    });
    expect(await runUndoQueue()).toEqual({ batchItemFailures: [] });
    expect(await prefsOf(USER_ID)).toEqual([]);
  });

  it("never touches another user's skips", async () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID, username: 'other' });
    await skip(USER_ID, ['S01E02']);
    await skip(OTHER_USER_ID, ['S01E02', 'S01E05']);
    const importId = await importRows([row(1, 2)]);
    await undo(importId);
    expect(await prefsOf(OTHER_USER_ID)).toEqual(['S01E02', 'S01E05']);
    expect(await prefsOf(USER_ID)).toEqual(['S01E02']);
  });

  it('still writes an import started before cleared skips were recorded', async () => {
    const importId = '00000000-0000-4000-8000-000000000001';
    seedUser({ lastImport: { createdAt: JAN_2020, importId, written: 0 } });
    await skip(USER_ID, ['S01E02']);
    const response = await request(`/me/imports/${importId}/batch`, {
      as: USER_ID,
      body: [row(1, 2)],
      method: 'POST',
    });
    expect(response.status).toBe(201);
    expect(await prefsOf(USER_ID)).toEqual([]);

    await undo(importId);
    expect(await episodes()).toEqual([]);
    // Nothing recorded, nothing to put back
    expect(await prefsOf(USER_ID)).toEqual([]);
  });

  it('creates no prefs record for a series without skips', async () => {
    seedUser();
    const importId = await importRows([row(1, 1)]);
    await undo(importId);
    expect(
      db.dump('Lists').filter((item) => String(item.sk).startsWith('PREF#')),
    ).toEqual([]);
  });
});
