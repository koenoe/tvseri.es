import { SQSClient } from '@aws-sdk/client-sqs';
import type { SQSEvent } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import { handler } from '@/lambdas/validateWatchedStatusQueue';
import { queueWatchedStatusValidation } from '@/lib/watchedStatus';
import { db } from './db';
import { fakeShow } from './fixtures/tmdb';
import { lambdaContext } from './lambdaContext';
import { episodes, listItem, seedWatched } from './library';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';
import { listItems, withStream } from './stream';

// The job keeps TMDB series in a module cache: one id per show
let nextShow = 8100;
const newShow = (
  seasons: Parameters<typeof fakeShow>[0]['seasons'],
  options: Readonly<{ status?: string; specials?: number }> = {},
) => {
  nextShow += 1;
  fakeShow({
    id: nextShow,
    seasons,
    status: options.status ?? 'Returning Series',
    ...(options.specials && {
      specials: { airDate: '2019-06-01', episodes: options.specials },
    }),
  });
  return nextShow;
};

const MONDAY = Date.UTC(2026, 10, 9, 3); // 9 Nov 2026, 03:00 UTC
const TUESDAY = Date.UTC(2026, 10, 10, 3);
const LAST_WATCH = '2025-03-01T20:00:00Z';

/** A list item as the stream writes it (status included) */
const seedListItem = (
  list: string,
  id: number,
  createdAt: number,
  status = 'Returning Series',
  userId = USER_ID,
) => db.seed('Lists', [{ ...listItem(userId, list, id, createdAt), status }]);

const run = async (userIds: ReadonlyArray<string> = [USER_ID]) => {
  const event = {
    Records: userIds.map((id, index) => ({
      body: JSON.stringify({ id }),
      messageId: `m${index}`,
    })),
  } as unknown as SQSEvent;
  return handler(event, lambdaContext());
};

const item = (sk: string, userId = USER_ID) =>
  listItems(userId).find((candidate) => candidate.sk === sk);
const finished = (show: number) => item(`LIST#WATCHED#ITEM#${show}`);
const inProgress = (show: number) => item(`LIST#IN_PROGRESS#ITEM#${show}`);

describe('nightly validation: finished shows', () => {
  it('moves a finished show with a new episode back to In progress, stamped now', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2026-10-01', aired: 5, episodes: 8 }]);
    seedWatched(USER_ID, show, episodes(1, 1, 4), LAST_WATCH);
    seedListItem('WATCHED', show, Date.parse(LAST_WATCH));

    expect(await run()).toEqual({ batchItemFailures: [] });

    expect(finished(show)).toBeUndefined();
    expect(inProgress(show)).toMatchObject({ createdAt: TUESDAY });
  });

  it('leaves a still finished show as it is (no rewrite)', async () => {
    vi.useFakeTimers({ now: MONDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2020-01-01', episodes: 4 }]);
    seedWatched(USER_ID, show, episodes(1, 1, 4), LAST_WATCH);
    seedListItem('WATCHED', show, 12345);

    await run();

    expect(finished(show)).toMatchObject({ createdAt: 12345 });
    expect(inProgress(show)).toBeUndefined();
  });

  it('leaves a finished show alone when TMDB lists nothing aired', async () => {
    vi.useFakeTimers({ now: MONDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2020-01-01', aired: 0, episodes: 4 }]);
    seedWatched(USER_ID, show, episodes(1, 1, 4), LAST_WATCH);
    seedListItem('WATCHED', show, 12345);

    await run();

    expect(finished(show)).toMatchObject({ createdAt: 12345 });
  });

  it('on the Monday full check, a finish that relied on specials goes back to In progress', async () => {
    vi.useFakeTimers({ now: MONDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2020-01-01', episodes: 6 }], {
      specials: 2,
    });
    // 4 regular + 2 specials: 6 items, but only 4 of 6 regular episodes
    seedWatched(
      USER_ID,
      show,
      [...episodes(0, 1, 2), ...episodes(1, 1, 4)],
      LAST_WATCH,
    );
    seedListItem('WATCHED', show, Date.parse(LAST_WATCH));

    await run();

    expect(finished(show)).toBeUndefined();
    expect(inProgress(show)).toMatchObject({ createdAt: MONDAY });
  });

  it('removes a finished show with nothing watched from every list and restores its watchlist entry', async () => {
    vi.useFakeTimers({ now: MONDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2020-01-01', episodes: 4 }]);
    seedListItem('WATCHED', show, 12345);
    seedListItem('RESUMING_SOON', show, 12345);
    const original = listItem(USER_ID, 'WATCHLIST', show, 999);
    db.seed('Lists', [
      {
        item: original,
        parkedAt: 1000,
        pk: `USER#${USER_ID}`,
        sk: `PARKED#WATCHLIST#${show}`,
      },
    ]);

    await run();

    expect(finished(show)).toBeUndefined();
    expect(item(`LIST#RESUMING_SOON#ITEM#${show}`)).toBeUndefined();
    expect(item(`LIST#WATCHLIST#ITEM#${show}`)).toEqual(original);
  });
});

describe('nightly validation: reconcile lists with watched items', () => {
  // A stream batch dropped after its retries: the marks are hours old
  const RECENT = new Date(TUESDAY - 6 * 60 * 60 * 1000).toISOString();

  it('heals a recent mark whose stream batch was dropped: placed where the stream would have', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const partly = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      status: 'Ended',
    });
    const fully = newShow([{ airDate: '2020-01-01', episodes: 3 }], {
      status: 'Ended',
    });
    seedWatched(USER_ID, partly, episodes(1, 1, 2), RECENT);
    seedWatched(USER_ID, fully, episodes(1, 1, 3), RECENT);

    await run();

    // createdAt = the latest watch (seedWatched spaces them a second apart)
    expect(inProgress(partly)).toMatchObject({
      createdAt: Date.parse(RECENT) + 1000,
    });
    expect(finished(fully)).toMatchObject({
      createdAt: Date.parse(RECENT) + 2000,
    });
  });

  it('never brings back a show removed from In progress by hand (watches older than 48 hours)', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const removed = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      status: 'Ended',
    });
    // a tile's Remove: DELETE …/list/in_progress/:id, watches stay
    const threeDaysAgo = new Date(TUESDAY - 3 * 86_400_000).toISOString();
    seedWatched(USER_ID, removed, episodes(1, 1, 2), threeDaysAgo);
    const before = listItems(USER_ID);

    await run();
    await run();

    expect(listItems(USER_ID)).toEqual(before);
  });

  it('leaves a recently watched show that is on the watchlist, or paused, alone', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const onWatchlist = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      status: 'Ended',
    });
    const hidden = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      status: 'Ended',
    });
    const kept = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      status: 'Ended',
    });
    for (const show of [onWatchlist, hidden, kept]) {
      seedWatched(USER_ID, show, episodes(1, 1, 2), RECENT);
    }
    seedListItem('WATCHLIST', onWatchlist, 5);
    db.seed('Lists', [
      {
        paused: 'hide',
        pausedAt: 1,
        pk: `USER#${USER_ID}`,
        seriesId: hidden,
        sk: `PREF#SERIES#${hidden}`,
      },
      {
        paused: 'keep',
        pausedAt: 1,
        pk: `USER#${USER_ID}`,
        seriesId: kept,
        sk: `PREF#SERIES#${kept}`,
      },
    ]);
    const before = listItems(USER_ID);

    await run();

    expect(listItems(USER_ID)).toEqual(before);
  });

  it('removes an In progress show with no regular episode watched', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      specials: 1,
      status: 'Ended',
    });
    seedWatched(USER_ID, show, episodes(0, 1, 1), LAST_WATCH);
    seedListItem('IN_PROGRESS', show, 1, 'Ended');

    await run();

    expect(inProgress(show)).toBeUndefined();
  });

  it('keeps one list when a show is in both', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      status: 'Ended',
    });
    seedWatched(USER_ID, show, episodes(1, 1, 2), LAST_WATCH);
    seedListItem('IN_PROGRESS', show, 1, 'Ended');
    seedListItem('WATCHED', show, 1, 'Ended');

    await run();

    expect(finished(show)).toBeUndefined();
    expect(inProgress(show)).toBeDefined();
  });

  it('leaves agreeing shows untouched and never reads another user', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    seedUser({ id: OTHER_USER_ID });
    const show = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      status: 'Ended',
    });
    seedWatched(USER_ID, show, episodes(1, 1, 2), LAST_WATCH);
    seedListItem('IN_PROGRESS', show, 777, 'Ended');
    // The other user's mismatch is not this message's business: recent
    // enough that a run over their data would heal it into In progress
    seedWatched(
      OTHER_USER_ID,
      show,
      episodes(1, 1, 2),
      new Date(TUESDAY - 6 * 60 * 60 * 1000).toISOString(),
    );
    const before = listItems(USER_ID);

    await run();

    expect(listItems(USER_ID)).toEqual(before);
    expect(listItems(OTHER_USER_ID)).toEqual([]);
  });
});

describe('nightly validation: change cap', () => {
  it('changes at most 10 shows of one user a night, logs loudly, and does the rest on later nights', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    seedUser();
    const shows = Array.from({ length: 12 }, () =>
      newShow([{ airDate: '2020-01-01', episodes: 5 }], { status: 'Ended' }),
    );
    for (const show of shows) {
      seedListItem('IN_PROGRESS', show, 1, 'Ended');
    }

    await run();
    const left = () =>
      shows.filter((show) => inProgress(show) !== undefined).length;
    expect(left()).toBe(2);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('[CAP]'));

    await run();
    expect(left()).toBe(0);
    error.mockRestore();
  });
});

describe('nightly cron (async-10)', () => {
  it('fails the invocation when it cannot queue the users, so Lambda counts an error', async () => {
    const { handler: cron } = await import(
      '@/lambdas/validateWatchedStatusCron'
    );
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const send = vi.spyOn(db, 'send').mockRejectedValue(new Error('down'));

    await expect(cron()).rejects.toThrow('down');

    send.mockRestore();
    error.mockRestore();
  });
});

describe('nightly validation: time left', () => {
  it('hands back the users it has no time for instead of timing out', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const event = {
      Records: [USER_ID, OTHER_USER_ID].map((id, index) => ({
        body: JSON.stringify({ id }),
        messageId: `m${index}`,
      })),
    } as unknown as SQSEvent;

    expect(await handler(event, lambdaContext(5_000))).toEqual({
      batchItemFailures: [{ itemIdentifier: 'm0' }, { itemIdentifier: 'm1' }],
    });
  });
});

describe('queueing users for the nightly check', () => {
  // The first entry of each refused send fails; setup.ts's fake answers the rest
  const refuse = (times: number) => {
    const send = vi.mocked(SQSClient.prototype.send);
    send.mockClear();
    for (let i = 0; i < times; i++) {
      send.mockImplementationOnce((async () => ({
        Failed: [{ Id: '0' }],
        Successful: [],
      })) as never);
    }
    return send;
  };

  it('sends an entry SQS refused once more', async () => {
    const send = refuse(1);

    expect(await queueWatchedStatusValidation(['a', 'b'])).toBe(0);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0]).toMatchObject({
      input: { Entries: [{ MessageBody: JSON.stringify({ id: 'a' }) }] },
    });
  });

  it('counts an entry refused twice as failed, without a third try', async () => {
    const send = refuse(2);

    expect(await queueWatchedStatusValidation(['a', 'b'])).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe('nightly reconcile: the cap counts changes only', () => {
  it('spends nothing on shows it can never fix, so a real drift still heals', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    seedUser();
    const recent = new Date(TUESDAY - 60 * 60 * 1000).toISOString();
    // 11 shows TMDB no longer knows (404), watched, in no list
    for (let i = 0; i < 11; i++) {
      nextShow += 1;
      seedWatched(USER_ID, nextShow, episodes(1, 1, 2), recent);
    }
    const drifted = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      status: 'Ended',
    });
    seedWatched(USER_ID, drifted, episodes(1, 1, 2), recent);

    await run();

    expect(inProgress(drifted)).toBeDefined();
  });

  it('a watched show TMDB lists nothing aired for is not listed, and not put back on the watchlist', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2020-01-01', aired: 0, episodes: 4 }]);
    seedWatched(
      USER_ID,
      show,
      episodes(1, 1, 2),
      new Date(TUESDAY - 60 * 60 * 1000).toISOString(),
    );
    seedListItem('IN_PROGRESS', show, 1);
    seedListItem('WATCHED', show, 1);
    db.seed('Lists', [
      {
        item: listItem(USER_ID, 'WATCHLIST', show, 999),
        parkedAt: 1000,
        pk: `USER#${USER_ID}`,
        sk: `PARKED#WATCHLIST#${show}`,
      },
    ]);
    const before = listItems(USER_ID);

    await run();

    expect(listItems(USER_ID)).toEqual(before);
  });
});

describe('a mark between the nightly read and its write (the stream wins)', () => {
  /**
   * Runs `mark` (through the stream) right after the job's first consistent
   * read of a show's watched items: the job then plans from data the mark
   * has overtaken.
   */
  const markDuringPlan = (mark: () => Promise<unknown>) => {
    let fired = false;
    const send = db.send.bind(db);
    return vi.spyOn(db, 'send').mockImplementation(async (command) => {
      const result = await send(command);
      const input = (command as { input?: Record<string, unknown> }).input;
      if (
        !fired &&
        input?.TableName === 'Watched' &&
        input.ConsistentRead === true
      ) {
        fired = true;
        await mark();
      }
      return result;
    });
  };

  const markEpisode = (show: number, episode: number, at: number) =>
    withStream(async () =>
      seedWatched(USER_ID, show, [[1, episode]], new Date(at).toISOString()),
    );

  it('a show finished by the user while the job moves it to In progress stays Finished', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2026-10-01', aired: 5, episodes: 8 }]);
    seedWatched(USER_ID, show, episodes(1, 1, 4), LAST_WATCH);
    seedListItem('WATCHED', show, Date.parse(LAST_WATCH));
    const spy = markDuringPlan(() => markEpisode(show, 5, TUESDAY - 1000));

    await run();
    spy.mockRestore();

    // The stream's sync of the mark: Finished, placed at the mark
    expect(finished(show)).toMatchObject({ createdAt: TUESDAY - 1000 });
    expect(inProgress(show)).toBeUndefined();
  });

  it('a show the user starts watching again while the job clears it stays In progress', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      status: 'Ended',
    });
    // In progress with nothing watched: the reconcile would clear it
    seedListItem('IN_PROGRESS', show, 1, 'Ended');
    const spy = markDuringPlan(() => markEpisode(show, 1, TUESDAY - 1000));

    await run();
    spy.mockRestore();

    expect(inProgress(show)).toMatchObject({ createdAt: TUESDAY - 1000 });
  });

  it('a skipped write gives its slot of the cap back', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    // Overtaken in the finished-show check, which runs first
    const show = newShow([{ airDate: '2026-10-01', aired: 5, episodes: 8 }]);
    seedWatched(USER_ID, show, episodes(1, 1, 4), LAST_WATCH);
    seedListItem('WATCHED', show, Date.parse(LAST_WATCH));
    // ...then ten real clean-ups for the reconcile: the whole cap
    const others = Array.from({ length: 10 }, () =>
      newShow([{ airDate: '2020-01-01', episodes: 5 }], { status: 'Ended' }),
    );
    for (const other of others) {
      seedListItem('IN_PROGRESS', other, 1, 'Ended');
    }
    const spy = markDuringPlan(() => markEpisode(show, 5, TUESDAY - 1000));

    await run();
    spy.mockRestore();

    expect(finished(show)).toBeDefined();
    expect(others.filter((other) => inProgress(other))).toEqual([]);
  });
});

describe('nightly counter heal', () => {
  const COUNT = `CACHE#profile:${USER_ID}:watched-count`;
  const RUNTIME = `CACHE#profile:${USER_ID}:watched-runtime:v3`;
  const seedCounters = (count: number, runtime: number) =>
    db.seed('Cache', [
      { pk: COUNT, value: count },
      { pk: RUNTIME, value: runtime },
    ]);
  const counter = (pk: string) =>
    db.dump('Cache').find((item) => item.pk === pk);
  const counterWrites = (from: number) =>
    db.calls
      .slice(from)
      .filter(
        (command) =>
          command.constructor.name === 'UpdateItemCommand' &&
          String(
            (command.input as { Key?: { pk?: { S?: string } } }).Key?.pk?.S,
          ).includes('watched-'),
      );

  it('corrects drifted counters from the read the job already does, specials left out, and says so', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    seedUser();
    const show = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      specials: 2,
      status: 'Ended',
    });
    // 3 regular episodes of 30 minutes, 1 special
    seedWatched(
      USER_ID,
      show,
      [...episodes(1, 1, 3), [0, 1] as const],
      LAST_WATCH,
      30,
    );
    seedListItem('IN_PROGRESS', show, 1, 'Ended');
    seedCounters(7, 999);

    await run();

    expect(counter(COUNT)).toMatchObject({ value: 3 });
    expect(counter(COUNT)).not.toHaveProperty('expiresAt');
    expect(counter(RUNTIME)).toMatchObject({ value: 90 });
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/count 7 -> 3/));
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/runtime 999 -> 90/),
    );
    log.mockRestore();
  });

  it('a user with nothing watched gets 0; a missing counter is left for the read to seed', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    db.seed('Cache', [{ pk: COUNT, value: 4 }]);

    await run();

    expect(counter(COUNT)).toMatchObject({ value: 0 });
    expect(counter(RUNTIME)).toBeUndefined();
  });

  it('writes nothing when the counters are right, so a re-run is a no-op', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      status: 'Ended',
    });
    seedWatched(USER_ID, show, episodes(1, 1, 2), LAST_WATCH);
    seedListItem('IN_PROGRESS', show, 1, 'Ended');
    seedCounters(9, 9);

    await run();
    const from = db.calls.length;
    await run();

    expect(counter(COUNT)).toMatchObject({ value: 2 });
    expect(counterWrites(from)).toEqual([]);
  });

  it('a mark between the job’s read and its write wins', async () => {
    vi.useFakeTimers({ now: TUESDAY, toFake: ['Date'] });
    seedUser();
    const show = newShow([{ airDate: '2020-01-01', episodes: 5 }], {
      status: 'Ended',
    });
    seedWatched(USER_ID, show, episodes(1, 1, 2), LAST_WATCH, 30);
    seedListItem('IN_PROGRESS', show, 1, 'Ended');
    // drifted: the job would write 2 and 60
    seedCounters(5, 150);
    const send = db.send.bind(db);
    let fired = false;
    const spy = vi.spyOn(db, 'send').mockImplementation(async (command) => {
      const result = await send(command);
      const input = (command as { input: Record<string, unknown> }).input;
      const isFullRead =
        input.TableName === 'Watched' &&
        !input.IndexName &&
        String(input.KeyConditionExpression).includes('begins_with');
      if (!fired && isFullRead) {
        fired = true;
        // the mark lands after the read: the job computed 2, the stream adds 1
        await withStream(async () =>
          seedWatched(
            USER_ID,
            show,
            [[1, 3]],
            new Date(TUESDAY - 1000).toISOString(),
            30,
          ),
        );
      }
      return result;
    });

    await run();
    spy.mockRestore();

    // the stream's delta stands; the drift is left for the next night
    expect(counter(COUNT)).toMatchObject({ value: 6 });
    expect(counter(RUNTIME)).toMatchObject({ value: 180 });

    await run();
    expect(counter(COUNT)).toMatchObject({ value: 3 });
    expect(counter(RUNTIME)).toMatchObject({ value: 90 });
  });
});
