import { BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import {
  type LibraryPage,
  LibraryPageSchema,
  LibrarySummarySchema,
} from '@tvseri.es/schemas';
import * as v from 'valibot';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { computeTaste } from '@/lib/tasteMatch';
import { db } from './db';
import { fakeShow } from './fixtures/tmdb';
import { episodes, listItem, seedWatched, tmdbEpisode } from './library';
import { measureRounds } from './readRounds';
import { measureReads } from './readUnits';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const OWNER = USER_ID;
const VISITOR = OTHER_USER_ID;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
});

/** A list item with its own title (gsi1sk as the API writes it) */
const item = (
  userId: string,
  list: string,
  id: number,
  createdAt: number,
  title = `Show ${id}`,
) => ({
  ...listItem(userId, list, id, createdAt),
  gsi1sk: title.toLowerCase(),
  slug: title.toLowerCase().replace(/\W+/g, '-'),
  title,
});

const hide = (userId: string, id: number, pausedAt: number) => ({
  paused: 'hide',
  pausedAt,
  pk: `USER#${userId}`,
  seriesId: id,
  sk: `PREF#SERIES#${id}`,
});

/**
 * The owner's library: 1 The Bear (watching), 2 Andor (finished, favourite),
 * 3 The White Lotus (watching), 4 Severance (watching, hidden), 5 11.22.63
 * (finished, resuming soon), 6 A Man on the Inside and 7 Black Doves
 * (watchlist, same date), 8 Élite (watchlist), plus a parked watchlist copy
 * and a `keep` pref that change nothing.
 */
const setup = () => {
  seedUser({ id: OWNER });
  seedUser({ id: VISITOR });
  db.seed('Lists', [
    item(OWNER, 'IN_PROGRESS', 1, 500, 'The Bear'),
    item(OWNER, 'FAVORITES', 1, 40, 'The Bear'),
    item(OWNER, 'WATCHED', 2, 300, 'Andor'),
    item(OWNER, 'FAVORITES', 2, 30, 'Andor'),
    item(OWNER, 'IN_PROGRESS', 3, 700, 'The White Lotus'),
    item(OWNER, 'IN_PROGRESS', 4, 600, 'Severance'),
    item(OWNER, 'WATCHED', 5, 200, '11.22.63'),
    item(OWNER, 'RESUMING_SOON', 5, 200, '11.22.63'),
    item(OWNER, 'WATCHLIST', 6, 120, 'A Man on the Inside'),
    item(OWNER, 'WATCHLIST', 7, 120, 'Black Doves'),
    item(OWNER, 'WATCHLIST', 8, 100, 'Élite'),
    hide(OWNER, 4, 650),
    { ...hide(OWNER, 1, 10), paused: 'keep' },
    // a finished show with an old Hide pref is not hidden
    hide(OWNER, 2, 20),
    {
      item: { M: {} },
      parkedAt: 1,
      pk: `USER#${OWNER}`,
      sk: 'PARKED#WATCHLIST#9',
    },
  ]);
};

const shelf = async (
  path: string,
  as: string | undefined = OWNER,
  owner = OWNER,
) => request(`/user/${owner}/library/${path}`, { as });

const page = async (path: string, as: string = OWNER, owner = OWNER) => {
  const response = await shelf(path, as, owner);
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  return v.parse(LibraryPageSchema, await response.json());
};

/** Write commands sent to these tables since the test began */
const writesTo = (tables: ReadonlyArray<string>) =>
  db.calls.filter(
    (command) =>
      /Put|Update|Delete|Write/.test(command.constructor.name) &&
      tables.some((table) =>
        JSON.stringify(command.input).includes(`"${table}"`),
      ),
  );

const ids = (result: LibraryPage) => result.items.map((entry) => entry.id);

describe('GET /user/:id/library (shelf counts)', () => {
  it('counts every shelf for the owner, hidden for the owner only', async () => {
    setup();
    const response = await request(`/user/${OWNER}/library`, { as: OWNER });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(v.parse(LibrarySummarySchema, await response.json())).toEqual({
      counts: {
        all: 8,
        favourites: 2,
        finished: 2,
        hidden: 1,
        watching: 2,
        watchlist: 3,
      },
    });

    const visitor = await request(`/user/${OWNER}/library`, { as: VISITOR });
    expect(((await visitor.json()) as { counts: object }).counts).toEqual({
      all: 8,
      favourites: 2,
      finished: 2,
      hidden: null,
      watching: 2,
      watchlist: 3,
    });
  });

  it('is signed-in only and 404s unknown or deleted profiles', async () => {
    setup();
    seedUser({ deletionRequestedAt: 1, id: '01JUSERDDDDDDDDDDDDDDDDDDD' });
    expect((await request(`/user/${OWNER}/library`)).status).toBe(401);
    expect(
      (await request('/user/01JUSERZZZZZZZZZZZZZZZZZZZ/library', { as: OWNER }))
        .status,
    ).toBe(404);
    expect(
      (await request('/user/01JUSERDDDDDDDDDDDDDDDDDDD/library', { as: OWNER }))
        .status,
    ).toBe(404);
  });

  it('reads two Queries of the owner partition and writes nothing', async () => {
    setup();
    const { report } = await measureReads(() =>
      request(`/user/${OWNER}/library`, { as: OWNER }),
    );
    expect(report.commands.QueryCommand).toBe(2);
    // the only write is the auth middleware's activity stamp on Users
    expect(writesTo(['Lists', 'Watched', 'Follow', 'Cache'])).toEqual([]);
  });
});

describe('GET /user/:id/library/:shelf', () => {
  it('shelves: hidden shows leave Watching, sit on Hidden and All, once', async () => {
    setup();
    expect(ids(await page('watching'))).toEqual([3, 1]);
    expect(ids(await page('hidden'))).toEqual([4]);
    const all = await page('all');
    expect(ids(all)).toEqual([3, 4, 1, 2, 5, 6, 7, 8]);
    expect(all.total).toBe(8);
    // RESUMING_SOON is no shelf and the parked copy is never read
    expect(new Set(ids(all)).size).toBe(all.items.length);
    const severance = all.items.find((entry) => entry.id === 4)!;
    expect(severance.on).toEqual({
      favourite: false,
      finished: false,
      hidden: true,
      watching: false,
      watchlist: false,
    });
    expect(severance.hiddenAt).toBe(650);
  });

  it('says "Seen, no date" for a finished show marked without dates', async () => {
    setup();
    // Andor (2): every episode "I don't remember"; 11.22.63 (5): dated
    db.seed(
      'Watched',
      episodes(1, 1, 3).map(([season, episode]) => ({
        dateUnknown: true,
        episodeNumber: episode,
        gsi1pk: `USER#${OWNER}#SERIES#2`,
        gsi1sk: `S0${season}#E0${episode}`,
        pk: `USER#${OWNER}`,
        seasonNumber: season,
        seriesId: 2,
        sk: `SERIES#2#S0${season}#E0${episode}`,
        userId: OWNER,
        watchedAt: 1,
      })),
    );
    seedWatched(OWNER, 5, episodes(1, 1, 8));
    const finished = await page('finished');
    expect(finished.items.map((entry) => [entry.id, entry.undated])).toEqual([
      [2, true],
      [5, false],
    ]);
    // shelves that draw no finished date leave it out
    expect((await page('watchlist')).items[0]?.undated).toBeUndefined();
  });

  it('reads by @username as by id (the web reads beside the profile)', async () => {
    setup();
    const byName = await request(
      `/user/@user-${OWNER.slice(-4).toLowerCase()}/library/watching`,
      {
        as: OWNER,
      },
    );
    expect(byName.status).toBe(200);
    const page = v.parse(LibraryPageSchema, await byName.json());
    expect(ids(page)).toEqual([3, 1]);
    expect(
      (await request('/user/@nobody-here/library/watching', { as: OWNER }))
        .status,
    ).toBe(404);
  });

  it('a visitor never sees Hidden', async () => {
    setup();
    expect((await shelf('hidden', VISITOR)).status).toBe(403);
    const all = await page('all', VISITOR);
    const severance = all.items.find((entry) => entry.id === 4)!;
    expect(severance.on.hidden).toBe(false);
    expect(severance.hiddenAt).toBeNull();
    expect(ids(await page('watching', VISITOR))).toEqual([3, 1]);
  });

  it('sorts each shelf (ties by id)', async () => {
    setup();
    expect(ids(await page('all?sort=az'))).toEqual([5, 2, 1, 7, 8, 6, 4, 3]);
    expect(ids(await page('watchlist'))).toEqual([6, 7, 8]);
    expect(ids(await page('watchlist?sort=oldest'))).toEqual([8, 6, 7]);
    expect(ids(await page('finished'))).toEqual([2, 5]);
    expect(ids(await page('favourites'))).toEqual([1, 2]);
    expect(ids(await page('hidden?sort=az'))).toEqual([4]);
  });

  it('finds by title prefix, with or without the article', async () => {
    setup();
    expect(ids(await page('all?q=white'))).toEqual([3]);
    expect(ids(await page('all?q=%20The%20Wh%20'))).toEqual([3]);
    expect(ids(await page('all?q=lotus'))).toEqual([]);
    expect(ids(await page('all?q=eli'))).toEqual([8]);
  });

  it('jumps to a letter and lists the letters', async () => {
    setup();
    const result = await page('all?sort=az&from=m&limit=2');
    expect(ids(result)).toEqual([6, 4]);
    expect(result.before).toBe(5);
    expect(result.letters).toEqual(['#', 'a', 'b', 'e', 'm', 's', 'w']);
    const above = await page(
      `all?sort=az&limit=24&before=${result.prevCursor}`,
    );
    expect(ids(above)).toEqual([5, 2, 1, 7, 8]);
    expect(above.prevCursor).toBeNull();
    expect((await page('all?sort=az&from=%23')).before).toBe(0);
  });

  it.each([
    ['all?with=new', 'with on your own profile'],
    ['finished?sort=left', 'a sort the shelf has not'],
    ['all?from=a', 'from without az'],
    ['all?cursor=junk', 'a garbage cursor'],
    ['all?cursor=a&before=b', 'cursor with before'],
    ['all?limit=25', 'limit above 24'],
    ['all?limit=0', 'limit 0'],
    ['all?limit=abc', 'limit not a number'],
    ['all?from=ab&sort=az', 'from not one letter'],
    [`all?q=${'x'.repeat(101)}`, 'q over 100'],
    [`all?cursor=${'x'.repeat(513)}`, 'a cursor over 512'],
  ])('400 for %s (%s)', async (path) => {
    setup();
    expect((await shelf(path)).status).toBe(400);
  });

  it('rejects a cursor from another sort and 404s an unknown shelf', async () => {
    setup();
    const az = await page('all?sort=az&limit=1');
    expect((await shelf(`all?cursor=${az.nextCursor}`)).status).toBe(400);
    expect((await shelf('stats')).status).toBe(404);
    expect((await request(`/user/${OWNER}/library/all`)).status).toBe(401);
  });

  it('computes the visitor filters for the token user, as the match counts shared', async () => {
    setup();
    db.seed('Lists', [
      item(VISITOR, 'WATCHED', 2, 1),
      item(VISITOR, 'IN_PROGRESS', 3, 1),
      item(VISITOR, 'FAVORITES', 1, 1),
      item(VISITOR, 'WATCHLIST', 6, 1),
    ]);
    const all = await page('all', VISITOR);
    const taste = computeTaste(
      { favorites: [1], inProgress: [3], watched: [2], watchlist: [6] },
      {
        favorites: [1, 2],
        inProgress: [1, 3, 4],
        watched: [2, 5],
        watchlist: [6, 7, 8],
      },
    );
    expect(all.filters).toEqual({ new: 4, shared: taste.sharedCount });
    expect(ids(await page('all?with=shared', VISITOR))).toEqual([3, 1, 2]);
    expect(ids(await page('all?with=new', VISITOR))).toEqual([4, 5, 7, 8]);
    expect((await page('all')).filters).toBeNull();
  });

  it('reads facts only for the page and progress without specials', async () => {
    setup();
    fakeShow({
      extra: {
        episode_run_time: [30],
        next_episode_to_air: tmdbEpisode(2, 4, '2026-11-17'),
      },
      id: 3,
      seasons: [
        { airDate: '2025-01-01', episodes: 4 },
        { airDate: '2026-10-20', aired: 3, episodes: 8 },
      ],
      specials: { airDate: '2024-12-01', episodes: 2 },
      status: 'Returning Series',
    });
    fakeShow({ id: 1, seasons: [{ airDate: '2020-01-01', episodes: 5 }] });
    seedWatched(OWNER, 3, [[0, 1], [0, 2], ...episodes(1, 1, 4), [2, 1]]);

    const { report, result } = await measureReads(() =>
      page('watching?limit=1'),
    );
    const factKeys = db.calls
      .filter((command) => command instanceof BatchGetItemCommand)
      .flatMap((command) =>
        Object.values(
          (command as BatchGetItemCommand).input.RequestItems ?? {},
        ).flatMap((request) => request.Keys ?? []),
      )
      .map((key) => key.pk?.S);
    expect(factKeys.some((key) => key?.endsWith(':1'))).toBe(false);
    expect(report.commands.QueryCommand).toBe(3);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      facts: {
        hasAired: true,
        seasonCount: 2,
        status: 'Returning Series',
      },
      id: 3,
      progress: {
        aired: 7,
        airing: true,
        lastSeason: 2,
        lastWatched: 'S02E01',
        next: 'S02E02',
        total: 12,
        toWatch: 2,
        watched: 5,
      },
    });
  });

  it('reads the summaries for progress and "Seen, no date" once, beside the facts', async () => {
    setup();
    // The Bear (1) is watching and a favourite, Andor (2) finished and one
    fakeShow({ id: 1, seasons: [{ airDate: '2020-01-01', episodes: 5 }] });
    fakeShow({ id: 2, seasons: [{ airDate: '2020-01-01', episodes: 3 }] });
    seedWatched(OWNER, 1, episodes(1, 1, 2));
    seedWatched(OWNER, 2, episodes(1, 1, 3));

    const watchlist = await measureRounds(() => page('watchlist'));
    db.calls.length = 0;
    const favourites = await measureRounds(() => page('favourites'));
    const summaryReads = db.calls.filter(
      (command) =>
        command instanceof BatchGetItemCommand &&
        JSON.stringify(command.input).includes('AGG#'),
    );
    expect(summaryReads).toHaveLength(1);
    // The summaries (one batch, then each show without one) take two
    // rounds; the facts read runs beside them, not before
    expect(favourites.rounds).toBeLessThanOrEqual(watchlist.rounds + 1);

    expect(
      favourites.result.items.map((entry) => [
        entry.id,
        entry.progress?.watched ?? null,
        entry.undated,
      ]),
    ).toEqual([
      [1, 2, false],
      [2, null, false],
    ]);
  });

  it('sorts Most left by the watched fraction', async () => {
    setup();
    fakeShow({ id: 1, seasons: [{ airDate: '2020-01-01', episodes: 10 }] });
    fakeShow({ id: 3, seasons: [{ airDate: '2020-01-01', episodes: 10 }] });
    seedWatched(OWNER, 1, episodes(1, 1, 8));
    seedWatched(OWNER, 3, episodes(1, 1, 2));
    const result = await page('watching?sort=left');
    expect(ids(result)).toEqual([3, 1]);
    expect(result.items.map((entry) => entry.progress?.watched)).toEqual([
      2, 8,
    ]);
  });
});

// 314 shows through the in-memory DynamoDB double: the checks count reads
// and items, never time; on a loaded machine the work alone can pass
// Vitest's 5 s default, so the limit is the job's, not the assertion's
describe('the heavy library', { timeout: 30_000 }, () => {
  const SHOWS = 314;

  const heavy = () => {
    seedUser({ id: OWNER });
    const items = Array.from({ length: SHOWS }, (_, index) => {
      const id = index + 1;
      const title = `Show ${String(id).padStart(3, '0')} with a long enough title`;
      if (index < 60) {
        return item(OWNER, 'IN_PROGRESS', id, 10_000 + index, title);
      }
      if (index < 270) {
        return item(OWNER, 'WATCHED', id, 5_000 + index, title);
      }
      return item(OWNER, 'WATCHLIST', id, 1_000 + (index % 7), title);
    });
    const favourites = items
      .slice(0, 98)
      .map((entry) => item(OWNER, 'FAVORITES', entry.id, 2_000, entry.title));
    db.seed('Lists', [
      ...items,
      ...favourites,
      ...Array.from({ length: 12 }, (_, index) =>
        hide(OWNER, index * 5 + 1, 9),
      ),
      ...Array.from({ length: 150 }, (_, index) => ({
        pk: `USER#${OWNER}`,
        seriesId: index + 100,
        sk: `PREF#SERIES#${index + 100}`,
        skipped: new Set(['S01E01', 'S01E02']),
        updatedAt: 1,
      })),
    ]);
    for (let id = 1; id <= 60; id++) {
      fakeShow({ id, seasons: [{ airDate: '2020-01-01', episodes: 60 }] });
      seedWatched(OWNER, id, episodes(1, 1, 40));
    }
    for (let id = 61; id <= 120; id++) {
      fakeShow({ id, seasons: [{ airDate: '2020-01-01', episodes: 30 }] });
    }
  };

  it('walks a shelf with an insert between pages: no repeats, nothing skipped', async () => {
    heavy();
    const seen: number[] = [];
    let cursor: string | null = null;
    let inserted = 9000;
    do {
      const result: LibraryPage = await page(
        `all?sort=az${cursor ? `&cursor=${cursor}` : ''}`,
      );
      seen.push(...ids(result));
      cursor = result.nextCursor;
      // someone adds a show at the top while the owner scrolls
      db.seed('Lists', [
        item(OWNER, 'WATCHLIST', inserted, 1, `Aaa ${inserted++}`),
      ]);
    } while (cursor);
    const original = seen.filter((id) => id <= SHOWS);
    expect(original).toHaveLength(SHOWS);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('pages back to the start with before', async () => {
    heavy();
    const first = await page('all?sort=az');
    const second = await page(`all?sort=az&cursor=${first.nextCursor}`);
    const third = await page(`all?sort=az&cursor=${second.nextCursor}`);
    expect(third.before).toBe(48);
    const back = await page(`all?sort=az&before=${third.prevCursor}`);
    expect(ids(back)).toEqual(ids(second));
    expect(back.before).toBe(24);
    const top = await page(`all?sort=az&before=${back.prevCursor}`);
    expect(ids(top)).toEqual(ids(first));
    expect(top.prevCursor).toBeNull();
    expect(top.before).toBe(0);
  });

  it('bounds the reads of a page view (measured)', async () => {
    heavy();
    const summary = await measureReads(() =>
      request(`/user/${OWNER}/library`, { as: OWNER }),
    );
    const watching = await measureReads(() => page('watching'));
    const next = await measureReads(() =>
      page(`watching?cursor=${watching.result.nextCursor}`),
    );
    const finished = await measureReads(() => page('finished'));
    seedUser({ id: VISITOR });
    db.seed('Lists', [item(VISITOR, 'WATCHED', 61, 1)]);
    const visitor = await measureReads(() =>
      page('favourites?with=new', VISITOR),
    );
    const left = await measureReads(() => page('watching?sort=left'));

    const reads = {
      finished: finished.report,
      left: left.report,
      next: next.report,
      summary: summary.report,
      visitor: visitor.report,
      watching: watching.report,
    };
    console.info(
      'library reads per view',
      JSON.stringify(
        Object.fromEntries(
          Object.entries(reads).map(([name, report]) => [
            name,
            { commands: report.commands, rru: report.rru },
          ]),
        ),
      ),
    );

    // summary: user + token user + two partition Queries
    expect(summary.report.commands.QueryCommand).toBe(2);
    expect(summary.report.rru.Lists).toBeLessThanOrEqual(20);
    // a Watching page: 2 partition Queries + 24 Watched queries, one facts batch
    expect(watching.report.commands.QueryCommand).toBeLessThanOrEqual(2 + 24);
    // facts, and the per-show summaries (not built here: each show is read)
    expect(watching.report.commands.BatchGetItemCommand).toBeLessThanOrEqual(2);
    expect(watching.report.totalRru).toBeLessThanOrEqual(80);
    expect(next.report.commands.QueryCommand).toBeLessThanOrEqual(2 + 24);
    // Finished draws no progress; one small Watched query per show for "Seen, no date"
    expect(finished.report.commands.QueryCommand).toBeLessThanOrEqual(2 + 24);
    expect(finished.report.totalRru).toBeLessThanOrEqual(80);
    // a visitor adds one keys-only Query of their own partition
    expect(visitor.report.commands.QueryCommand).toBeLessThanOrEqual(3 + 24);
    // Most left reads every watching show's progress (48 here)
    expect(left.report.commands.QueryCommand).toBeLessThanOrEqual(2 + 48);
    expect(left.report.totalRru).toBeLessThanOrEqual(120);
  });
});
