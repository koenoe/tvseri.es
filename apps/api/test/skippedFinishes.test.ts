import { marshall } from '@aws-sdk/util-dynamodb';
import type { Context, SQSEvent } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import { handler as undoImportHandler } from '@/lambdas/undoImport';
import { handler as nightly } from '@/lambdas/validateWatchedStatusQueue';
import { handler as streamHandler } from '@/lambdas/watched';
import { db, sqsMessages } from './db';
import { fakeShow } from './fixtures/tmdb';
import { episodes, listItem, seedWatched } from './library';
import { request } from './request';
import { seedUser, USER_ID } from './seed';
import { listItems, streamEvent, withStream } from './stream';

// TMDB series are cached per container: one id per show
let nextShow = 9600;
const newShow = (
  aired: number,
  options: Readonly<{ episodes?: number; status?: string }> = {},
) => {
  nextShow += 1;
  fakeShow({
    id: nextShow,
    seasons: [
      { airDate: '2026-01-01', aired, episodes: options.episodes ?? aired },
    ],
    status: options.status ?? 'Ended',
  });
  return nextShow;
};

const JAN_2026 = Date.UTC(2026, 0, 1);
const day = (n: number) => JAN_2026 + n * 86_400_000;

const mark = async (show: number, episode: number, watchedAt: number) => {
  const response = await request(
    `/user/${USER_ID}/watched/series/${show}/season/1/episode/${episode}`,
    { as: USER_ID, body: { watchedAt, watchProvider: null }, method: 'POST' },
  );
  expect(response.status).toBe(201);
};

const prefs = (show: number, body: unknown) =>
  request(`/me/series/${show}/prefs`, { as: USER_ID, body, method: 'PATCH' });

const skip = async (show: number, codes: ReadonlyArray<string>) => {
  const response = await prefs(show, { skip: codes });
  expect(response.status).toBe(200);
};

const unskip = async (show: number, codes: ReadonlyArray<string>) => {
  const response = await prefs(show, { unskip: codes });
  expect(response.status).toBe(200);
};

const item = (sk: string) =>
  listItems(USER_ID).find((candidate) => candidate.sk === sk);
const finished = (show: number) => item(`LIST#WATCHED#ITEM#${show}`);
const inProgress = (show: number) => item(`LIST#IN_PROGRESS#ITEM#${show}`);
const lists = () =>
  listItems(USER_ID)
    .map((entry) => String(entry.sk))
    .filter((sk) => sk.startsWith('LIST#'));

describe('a skipped episode counts as done for Finished', () => {
  it('the stream finishes a show whose other aired episodes are skipped', async () => {
    seedUser();
    const show = newShow(3);
    await skip(show, ['S01E03']);

    const from = db.calls.length;
    await withStream(async () =>
      seedWatched(USER_ID, show, episodes(1, 1, 2), '2026-02-01T20:00:00Z'),
    );

    // One consistent read of the prefs row per show sync
    const prefsReads = db.calls
      .slice(from)
      .filter((call) => JSON.stringify(call.input).includes('PREF#SERIES#'));
    expect(prefsReads.map((call) => call.input)).toEqual([
      expect.objectContaining({ ConsistentRead: true }),
    ]);
    expect(finished(show)).toMatchObject({
      createdAt: Date.parse('2026-02-01T20:00:00Z') + 1000,
    });
    expect(inProgress(show)).toBeUndefined();
  });

  it('the mark request finishes it before the stream runs', async () => {
    seedUser();
    const show = newShow(3);
    await skip(show, ['S01E02']);

    await mark(show, 1, day(1));
    await mark(show, 3, day(3));

    expect(lists()).toEqual([`LIST#WATCHED#ITEM#${show}`]);
    expect(finished(show)).toMatchObject({ createdAt: day(3) });
  });

  it('only skips, nothing watched: in no list', async () => {
    seedUser();
    const show = newShow(3);

    await withStream(() => skip(show, ['S01E01', 'S01E02', 'S01E03']));

    expect(lists()).toEqual([]);
  });

  it('a skip of an episode yet to air or one TMDB does not list finishes nothing', async () => {
    seedUser();
    const show = newShow(2, { episodes: 4 });
    await skip(show, ['S01E03', 'S01E04', 'S02E01']);

    await withStream(() => mark(show, 1, day(1)));

    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });

  it('a skipped episode that is also watched counts once', async () => {
    seedUser();
    const show = newShow(3);
    await withStream(() => mark(show, 1, day(1)));
    // A skip of a watched episode (the web never sends it; the set allows it)
    await skip(show, ['S01E01']);

    await withStream(() => mark(show, 2, day(2)));

    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });
});

describe('PATCH /me/series/:id/prefs places the show after a skip or unskip', () => {
  it('skipping the rest finishes the show; unskipping one moves it back', async () => {
    seedUser();
    const show = newShow(4);
    await withStream(() => mark(show, 1, day(1)));
    await withStream(() => mark(show, 2, day(2)));

    await skip(show, ['S01E03', 'S01E04']);
    expect(lists()).toEqual([`LIST#WATCHED#ITEM#${show}`]);
    // The finished date stays the last watch
    expect(finished(show)).toMatchObject({ createdAt: day(2) });

    await unskip(show, ['S01E04']);
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
    expect(inProgress(show)).toMatchObject({ createdAt: day(2) });
  });

  it('never fails the request when the placement fails', async () => {
    seedUser();
    const show = newShow(2);
    await withStream(() => mark(show, 1, day(1)));
    const send = db.send.bind(db);
    const spy = vi.spyOn(db, 'send').mockImplementation(async (command) => {
      if (command.constructor.name === 'TransactWriteItemsCommand') {
        throw new Error('throttled');
      }
      return send(command);
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await prefs(show, { skip: ['S01E02'] });
    spy.mockRestore();
    warn.mockRestore();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ skipped: ['S01E02'] });
    // Left as it was, for the next sync to heal
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });

  it('does not touch the lists for a prefs change without skips', async () => {
    seedUser();
    const show = newShow(2);
    // In progress with nothing watched: a placement would clear it
    db.seed('Lists', [listItem(USER_ID, 'IN_PROGRESS', show, 5)]);

    expect((await prefs(show, { paused: 'keep' })).status).toBe(200);

    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });

  it('refuses an empty skip or unskip, so it never places the show', async () => {
    seedUser();
    const show = newShow(2);
    // In progress with nothing watched: a placement would clear it
    db.seed('Lists', [listItem(USER_ID, 'IN_PROGRESS', show, 5)]);

    expect((await prefs(show, { skip: [] })).status).toBe(400);
    expect((await prefs(show, { unskip: [] })).status).toBe(400);
    expect((await prefs(show, { skip: [], unskip: [] })).status).toBe(400);

    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });

  it('a mark landing between the skip placement’s reads and its write: the newer state stands', async () => {
    seedUser();
    const show = newShow(3);
    await withStream(() => mark(show, 1, day(1)));
    // The skip's placement reads the watched items (E1 only: its plan is
    // In progress), then the mark of E2 finishes the show, then the skip
    // writes: its write must not undo the mark's Finished
    const send = db.send.bind(db);
    let fired = false;
    const spy = vi.spyOn(db, 'send').mockImplementation(async (command) => {
      const result = await send(command);
      const input = (command as { input?: Record<string, unknown> }).input;
      if (
        !fired &&
        input?.TableName === 'Watched' &&
        input.ConsistentRead === true
      ) {
        fired = true;
        await mark(show, 2, day(2));
      }
      return result;
    });

    await skip(show, ['S01E03']);
    spy.mockRestore();

    expect(lists()).toEqual([`LIST#WATCHED#ITEM#${show}`]);
    expect(finished(show)).toMatchObject({ createdAt: day(2) });
  });
});

describe('an import and its Undo keep the lists right with skips', () => {
  const row = (show: number, episodeNumber: number, watchedAt: number) => ({
    episode: {
      airDate: '2026-01-01T00:00:00.000Z',
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

  const runUndo = () => {
    const messages = sqsMessages
      .splice(0)
      .filter(({ queueUrl }) => queueUrl === 'https://sqs.test/undo-import');
    return undoImportHandler(
      {
        Records: messages.map((message, index) => ({
          body: JSON.stringify(message.body),
          messageId: `m${index}`,
        })),
      } as unknown as SQSEvent,
      { getRemainingTimeInMillis: () => 300_000 } as unknown as Context,
    );
  };

  it('a stream sync of the Undo’s deletes sees the skips it puts back', async () => {
    seedUser();
    const show = newShow(3);
    await withStream(() => mark(show, 1, day(1)));
    await withStream(() => mark(show, 2, day(2)));
    await skip(show, ['S01E03']);
    expect(lists()).toEqual([`LIST#WATCHED#ITEM#${show}`]);

    // The import watches E3 (its skip is cleared): still Finished
    let importId = '';
    await withStream(async () => {
      const started = await request('/me/imports', {
        as: USER_ID,
        method: 'POST',
      });
      importId = ((await started.json()) as { importId: string }).importId;
      const response = await request(`/me/imports/${importId}/batch`, {
        as: USER_ID,
        body: [row(show, 3, day(3))],
        method: 'POST',
      });
      expect(response.status).toBe(201);
    });
    expect(lists()).toEqual([`LIST#WATCHED#ITEM#${show}`]);

    // Undo: the stream runs right after each delete, as fast as it can
    const response = await request(`/me/imports/${importId}`, {
      as: USER_ID,
      method: 'DELETE',
    });
    expect(response.status).toBe(202);
    const imported = db
      .dump('Watched')
      .find((entry) => String(entry.sk).endsWith('#E003'));
    const send = db.send.bind(db);
    const spy = vi.spyOn(db, 'send').mockImplementation(async (command) => {
      const result = await send(command);
      const input = (command as { input?: Record<string, unknown> }).input;
      if (
        command.constructor.name === 'DeleteItemCommand' &&
        input?.TableName === 'Watched' &&
        imported
      ) {
        await streamHandler(
          streamEvent([
            {
              dynamodb: { OldImage: marshall(imported) as never },
              eventName: 'REMOVE',
            },
          ]),
        );
      }
      return result;
    });
    expect(await runUndo()).toEqual({ batchItemFailures: [] });
    spy.mockRestore();

    expect(lists()).toEqual([`LIST#WATCHED#ITEM#${show}`]);
    expect(finished(show)).toMatchObject({ createdAt: day(2) });
  });
});

const runNightly = () =>
  nightly({
    Records: [{ body: JSON.stringify({ id: USER_ID }), messageId: 'm0' }],
  } as unknown as SQSEvent);

const MONDAY = Date.UTC(2026, 10, 9, 3);
const TUESDAY = Date.UTC(2026, 10, 10, 3);

describe('the nightly job agrees with skips', () => {
  it('leaves a show finished through skips alone, night after night', async () => {
    vi.useFakeTimers({ now: MONDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow(5, { episodes: 8, status: 'Returning Series' });
    await skip(show, ['S01E04', 'S01E05']);
    seedWatched(USER_ID, show, episodes(1, 1, 3), '2026-01-01T20:00:00Z');
    const finishedAt = Date.parse('2026-01-01T20:00:00Z') + 2000;
    db.seed('Lists', [
      {
        ...listItem(USER_ID, 'WATCHED', show, finishedAt),
        status: 'Returning Series',
      },
    ]);

    const from = db.calls.length;
    await runNightly();
    vi.setSystemTime(TUESDAY);
    await runNightly();

    expect(finished(show)).toMatchObject({ createdAt: finishedAt });
    expect(inProgress(show)).toBeUndefined();
    // Its skips come from one batch read a night, never a read per show
    const prefsReads = db.calls
      .slice(from)
      .filter((call) => JSON.stringify(call.input).includes('PREF#SERIES#'))
      .map((call) => call.constructor.name);
    expect(prefsReads).toEqual(['BatchGetItemCommand', 'BatchGetItemCommand']);
  });

  it('moves it back to In progress when a new episode airs', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    // Six of eight aired; the user watched 1-3 and skipped 4-5
    const show = newShow(6, { episodes: 8, status: 'Returning Series' });
    await skip(show, ['S01E04', 'S01E05']);
    seedWatched(USER_ID, show, episodes(1, 1, 3), '2026-01-01T20:00:00Z');
    db.seed('Lists', [
      {
        ...listItem(
          USER_ID,
          'WATCHED',
          show,
          Date.parse('2026-01-01T20:00:00Z'),
        ),
        status: 'Returning Series',
      },
    ]);

    await runNightly();

    expect(finished(show)).toBeUndefined();
    expect(inProgress(show)).toMatchObject({ createdAt: TUESDAY });
  });

  it('the reconcile never re-places a show finished through skips', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow(3);
    const recent = new Date(TUESDAY - 60 * 60 * 1000).toISOString();
    await skip(show, ['S01E03']);
    seedWatched(USER_ID, show, episodes(1, 1, 2), recent);
    db.seed('Lists', [
      listItem(USER_ID, 'WATCHED', show, Date.parse(recent) + 1000),
    ]);
    const before = listItems(USER_ID);

    await runNightly();

    expect(listItems(USER_ID)).toEqual(before);
  });

  it('the reconcile heals a dropped batch into Finished when the rest is skipped', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow(3);
    const recent = new Date(TUESDAY - 60 * 60 * 1000).toISOString();
    await skip(show, ['S01E03']);
    seedWatched(USER_ID, show, episodes(1, 1, 2), recent);

    await runNightly();

    expect(lists()).toEqual([`LIST#WATCHED#ITEM#${show}`]);
  });

  it('the reconcile keeps one list for a show in both, by the same rule', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow(3);
    await skip(show, ['S01E03']);
    seedWatched(USER_ID, show, episodes(1, 1, 2), '2026-01-01T20:00:00Z');
    db.seed('Lists', [
      listItem(USER_ID, 'WATCHED', show, 1),
      listItem(USER_ID, 'IN_PROGRESS', show, 1),
    ]);

    await runNightly();

    expect(lists()).toEqual([`LIST#WATCHED#ITEM#${show}`]);
  });
});
