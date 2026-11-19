import { marshall } from '@aws-sdk/util-dynamodb';
import type { SQSEvent } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import { handler as undoImportHandler } from '@/lambdas/undoImport';
import { handler as nightly } from '@/lambdas/validateWatchedStatusQueue';
import { handler as streamHandler } from '@/lambdas/watched';
import { db, sqsMessages } from './db';
import { fakeShow } from './fixtures/tmdb';
import { lambdaContext } from './lambdaContext';
import { episodes, listItem, seedWatched } from './library';
import { markEpisode } from './markEpisode';
import { request } from './request';
import { seedUser, USER_ID } from './seed';
import { listItems, recordWrites, streamEvent, withStream } from './stream';

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
  const response = await markEpisode({ episode, show, watchedAt });
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

    // Two consistent reads of the prefs row per show sync: before planning
    // and after writing (a skip saved meanwhile)
    const prefsReads = db.calls
      .slice(from)
      .filter((call) => JSON.stringify(call.input).includes('PREF#SERIES#'));
    expect(prefsReads.map((call) => call.input)).toEqual([
      expect.objectContaining({ ConsistentRead: true }),
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

  it('finishes by the real episode numbers where TMDB numbers on across seasons', async () => {
    seedUser();
    nextShow += 1;
    const show = nextShow;
    // Naruto Shippuden-like: S1 = E1…E6, S2 = E7…E9 (S2's last lies more
    // than a lagging count past its 3, so it reads as numbered on)
    fakeShow({
      id: show,
      numberedOn: true,
      seasons: [
        { airDate: '2025-01-01', episodes: 6 },
        { airDate: '2026-01-01', episodes: 3 },
      ],
    });
    await skip(show, ['S02E09']);

    await withStream(async () =>
      seedWatched(
        USER_ID,
        show,
        [...episodes(1, 1, 6), ...episodes(2, 7, 8)],
        '2026-02-01T20:00:00Z',
      ),
    );

    expect(lists()).toEqual([`LIST#WATCHED#ITEM#${show}`]);
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

describe('a skip landing while the stream places the show', () => {
  it('the stream does not overwrite the skip’s newer placement', async () => {
    seedUser();
    const show = newShow(3);
    await withStream(() => mark(show, 1, day(1)));
    const records = await recordWrites(async () =>
      seedWatched(USER_ID, show, [[1, 2]], new Date(day(2)).toISOString()),
    );
    // The stream reads the skips (none), then the user skips E3: that
    // placement finishes the show before the stream writes its In progress
    const send = db.send.bind(db);
    let fired = false;
    const spy = vi.spyOn(db, 'send').mockImplementation(async (command) => {
      const result = await send(command);
      if (
        !fired &&
        command.constructor.name === 'GetItemCommand' &&
        JSON.stringify(command.input).includes('PREF#SERIES#')
      ) {
        fired = true;
        await skip(show, ['S01E03']);
      }
      return result;
    });

    await streamHandler(streamEvent(records));
    spy.mockRestore();

    expect(fired).toBe(true);
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
      lambdaContext(),
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
  nightly(
    {
      Records: [{ body: JSON.stringify({ id: USER_ID }), messageId: 'm0' }],
    } as unknown as SQSEvent,
    lambdaContext(),
  );

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
    // Its skips come from batch reads, never a read per show
    const prefsReads = db.calls
      .slice(from)
      .filter((call) => JSON.stringify(call.input).includes('PREF#SERIES#'))
      .map((call) => call.constructor.name);
    expect(prefsReads).toContain('BatchGetItemCommand');
    expect(prefsReads).not.toContain('GetItemCommand');
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

describe('the nightly job places shows whose skips changed (the backstop for a failed placement)', () => {
  /** A skip whose in-request placement failed: the prefs are written, the lists not */
  const skipWithoutPlacement = async (
    show: number,
    body: Readonly<{ skip?: string[]; unskip?: string[] }>,
  ) => {
    const send = db.send.bind(db);
    const spy = vi.spyOn(db, 'send').mockImplementation(async (command) => {
      if (command.constructor.name === 'TransactWriteItemsCommand') {
        throw new Error('throttled');
      }
      return send(command);
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await prefs(show, body)).status).toBe(200);
    spy.mockRestore();
    warn.mockRestore();
  };

  it('finishes a show whose skip placement failed, the next night', async () => {
    vi.useFakeTimers({ now: TUESDAY - 3_600_000, toFake: ['Date'] });
    seedUser();
    const show = newShow(3);
    seedWatched(USER_ID, show, episodes(1, 1, 2), '2026-01-01T20:00:00Z');
    db.seed('Lists', [listItem(USER_ID, 'IN_PROGRESS', show, 7)]);
    await skipWithoutPlacement(show, { skip: ['S01E03'] });
    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);

    vi.setSystemTime(TUESDAY);
    await runNightly();

    expect(lists()).toEqual([`LIST#WATCHED#ITEM#${show}`]);
  });

  it('moves a finished show back to In progress after an unskip whose placement failed', async () => {
    vi.useFakeTimers({ now: TUESDAY - 3_600_000, toFake: ['Date'] });
    seedUser();
    const show = newShow(3);
    seedWatched(USER_ID, show, episodes(1, 1, 2), '2026-01-01T20:00:00Z');
    await skip(show, ['S01E03']);
    db.seed('Lists', [listItem(USER_ID, 'WATCHED', show, 7)]);
    await skipWithoutPlacement(show, { unskip: ['S01E03'] });

    vi.setSystemTime(TUESDAY);
    await runNightly();

    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });

  it('leaves agreeing shows and hand removals alone, and reads the prefs in one query', async () => {
    vi.useFakeTimers({ now: TUESDAY - 3_600_000, toFake: ['Date'] });
    seedUser();
    // Placed already: its place in the list is kept
    const agreeing = newShow(3);
    seedWatched(USER_ID, agreeing, episodes(1, 1, 2), '2026-01-01T20:00:00Z');
    db.seed('Lists', [listItem(USER_ID, 'WATCHED', agreeing, 7)]);
    await skipWithoutPlacement(agreeing, { skip: ['S01E03'] });
    // Removed from In progress by hand, then hidden: stays out
    const removed = newShow(3);
    seedWatched(USER_ID, removed, episodes(1, 1, 1), '2026-01-01T20:00:00Z');
    expect((await prefs(removed, { paused: 'keep' })).status).toBe(200);
    const before = listItems(USER_ID);

    vi.setSystemTime(TUESDAY);
    const from = db.calls.length;
    await runNightly();

    expect(listItems(USER_ID)).toEqual(before);
    const prefsQueries = db.calls
      .slice(from)
      .filter(
        (call) =>
          call.constructor.name === 'QueryCommand' &&
          JSON.stringify(call.input).includes('PREF#'),
      );
    expect(prefsQueries).toHaveLength(1);
  });

  it('a skip older than its window is not planned again', async () => {
    vi.useFakeTimers({ now: TUESDAY - 5 * 86_400_000, toFake: ['Date'] });
    seedUser();
    const show = newShow(3);
    seedWatched(USER_ID, show, episodes(1, 1, 2), '2026-01-01T20:00:00Z');
    db.seed('Lists', [listItem(USER_ID, 'IN_PROGRESS', show, 7)]);
    await skipWithoutPlacement(show, { skip: ['S01E03'] });

    vi.setSystemTime(TUESDAY);
    await runNightly();

    expect(lists()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);
  });
});

describe('a season or whole-show mark leaves skipped episodes skipped', () => {
  const watchedCodes = () =>
    db
      .dump('Watched')
      .map((row) => String(row.sk).split('#').slice(-2).join(''))
      .sort();
  const skippedOf = async (show: number) => {
    const response = await request(`/me/series/${show}/prefs`, {
      as: USER_ID,
    });
    return ((await response.json()) as { skipped: string[] }).skipped;
  };
  // As the web sends it: the scope's watched set back, in the track view
  const markScope = (show: number, season?: number) =>
    request(
      season === undefined
        ? `/user/${USER_ID}/watched/series/${show}?view=track`
        : `/user/${USER_ID}/watched/series/${show}/season/${season}?view=track`,
      { as: USER_ID, body: { watchProvider: null }, method: 'POST' },
    );
  const codesOf = async (response: Response) =>
    (
      (await response.json()) as Array<{
        seasonNumber: number;
        episodeNumber: number;
      }>
    )
      .map((item) => `S${item.seasonNumber}E${item.episodeNumber}`)
      .sort();

  it('a season mark writes the open episodes only and keeps the skip', async () => {
    seedUser();
    const show = newShow(4);
    await skip(show, ['S01E02']);
    const response = await markScope(show, 1);
    expect(response.status).toBe(201);
    expect(watchedCodes()).toEqual(['S001E001', 'S001E003', 'S001E004']);
    expect(await skippedOf(show)).toEqual(['S01E02']);
    // the answer is the season's watched set: the skip isn't in it
    expect(await codesOf(response)).toEqual(['S1E1', 'S1E3', 'S1E4']);
  });

  it('a whole-show mark too, and the show is Finished by its skips', async () => {
    seedUser();
    const show = newShow(3);
    await skip(show, ['S01E03']);
    await markEpisode({ episode: 1, show, watchedAt: day(1) });
    await withStream(async () => {
      const response = await markScope(show);
      expect(response.status).toBe(201);
      // every watched episode of the show, the one there before included
      expect(await codesOf(response)).toEqual(['S1E1', 'S1E2']);
    });
    expect(watchedCodes()).toEqual(['S001E001', 'S001E002']);
    expect(await skippedOf(show)).toEqual(['S01E03']);
    expect(finished(show)).toBeDefined();
  });
});
