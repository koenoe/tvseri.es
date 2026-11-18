import { marshall } from '@aws-sdk/util-dynamodb';
import type { SQSEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { handler as nightly } from '@/lambdas/validateWatchedStatusQueue';
import { handler as stream } from '@/lambdas/watched';
import { getAllWatchedForTvSeries } from '@/lib/db/watched';
import {
  buildRollups,
  readAllRollups,
  readShowItems,
  writeRollup,
} from '@/lib/rollups';
import { getAllTimeWatchedItems } from '@/lib/stats/data';
import { calculateAllTime } from '@/lib/stats/segments';
import { db } from './db';
import { fakeShow } from './fixtures/tmdb';
import { lambdaContext } from './lambdaContext';
import { markEpisode } from './markEpisode';
import { measureReads } from './readUnits';
import { request } from './request';
import { seedUser, USER_ID } from './seed';
import { recordWrites, streamEvent } from './stream';

const pad = (n: number) => String(n).padStart(3, '0');
const random = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

const watchedItem = (
  seriesId: number,
  season: number,
  episode: number,
  watchedAt: number,
  extra: Record<string, unknown> = {},
) => ({
  episodeNumber: episode,
  gsi1pk: `USER#${USER_ID}#SERIES#${seriesId}`,
  gsi1sk: `S${pad(season)}#E${pad(episode)}`,
  ...(!extra.dateUnknown && {
    gsi2pk: `USER#${USER_ID}#WATCHED`,
    gsi2sk: watchedAt,
  }),
  pk: `USER#${USER_ID}`,
  runtime: 30 + (episode % 4) * 10,
  seasonNumber: season,
  seriesId,
  sk: `SERIES#${seriesId}#S${pad(season)}#E${pad(episode)}`,
  userId: USER_ID,
  watchedAt,
  ...extra,
});

const runNightly = () =>
  nightly(
    {
      Records: [{ body: JSON.stringify({ id: USER_ID }), messageId: 'm' }],
    } as unknown as SQSEvent,
    lambdaContext(),
  );

const SHOWS = [9601, 9602, 9603, 9604];
const setupShows = () => {
  for (const id of SHOWS) {
    fakeShow({ id, seasons: [{ airDate: '2020-01-01', episodes: 10 }] });
  }
};

/** Every show's summary, as items sorted, against the show's items read */
const expectSummariesMatch = async () => {
  const fromRollups = await readShowItems(USER_ID, SHOWS);
  for (const id of SHOWS) {
    const truth = await getAllWatchedForTvSeries({
      attributes: [
        'seasonNumber',
        'episodeNumber',
        'watchedAt',
        'dateUnknown',
        'runtime',
      ],
      tvSeriesId: id,
      userId: USER_ID,
    });
    const norm = (items: ReadonlyArray<Record<string, unknown>>) =>
      items
        .map((item) => [
          item.seasonNumber,
          item.episodeNumber,
          item.watchedAt,
          item.dateUnknown ? 1 : 0,
          item.runtime ?? 0,
        ])
        .sort((a, b) => String(a).localeCompare(String(b)));
    expect(norm(fromRollups.get(id) ?? []), `show ${id}`).toEqual(norm(truth));
  }
};

describe('per-show summaries', () => {
  it('match the watched items after random marks, unmarks, re-dates, undated and specials, with duplicated and replayed stream batches', async () => {
    for (let seed = 1; seed <= 12; seed++) {
      db.reset();
      seedUser({ country: 'US' });
      setupShows();
      await runNightly(); // builds (nothing yet) and marks them complete
      const next = random(seed);
      const delivered: Array<ReturnType<typeof streamEvent>> = [];
      for (let step = 0; step < 40; step++) {
        const seriesId = SHOWS[Math.floor(next() * SHOWS.length)]!;
        const season = next() < 0.15 ? 0 : 1;
        const episode = 1 + Math.floor(next() * 6);
        const roll = next();
        const records = await recordWrites(async () => {
          const sk = `SERIES#${seriesId}#S${pad(season)}#E${pad(episode)}`;
          const existing = db
            .dump('Watched')
            .find((item) => item.sk === sk && item.pk === `USER#${USER_ID}`);
          if (roll < 0.55) {
            db.seed('Watched', [
              watchedItem(
                seriesId,
                season,
                episode,
                Date.UTC(2024, 11, 31) + Math.floor(next() * 3 * 86_400_000),
                next() < 0.1 ? { dateUnknown: true } : {},
              ),
            ]);
          } else if (existing) {
            await db.send({
              constructor: { name: 'DeleteItemCommand' },
              input: {
                Key: marshall({ pk: existing.pk, sk: existing.sk }),
                TableName: 'Watched',
              },
            } as never);
          }
        });
        if (records.length === 0) {
          continue;
        }
        const event = streamEvent(records);
        delivered.push(event);
        await stream(event);
        // at-least-once: sometimes the same batch again, sometimes an old one
        if (next() < 0.2) {
          await stream(event);
        }
        if (next() < 0.1 && delivered.length > 2) {
          await stream(delivered[Math.floor(next() * delivered.length)]!);
        }
      }
      await expectSummariesMatch();
      const years = await request(`/user/${USER_ID}/stats/years`);
      const fromSummaries = (await years.json()) as Record<string, unknown>;
      const recomputed = calculateAllTime(
        await getAllTimeWatchedItems(USER_ID),
        'America/New_York',
      );
      expect(fromSummaries, `seed ${seed}`).toEqual({
        timeZone: recomputed.timeZone,
        undated: recomputed.undated,
        years: recomputed.years,
      });
    }
  });

  it('a mark through the API writes its show’s summary in the request', async () => {
    seedUser();
    setupShows();
    await runNightly();
    const response = await markEpisode({
      episode: 2,
      show: SHOWS[0]!,
      watchedAt: Date.UTC(2025, 0, 2),
    });
    expect(response.status).toBe(201);
    expect((await readShowItems(USER_ID, [SHOWS[0]!])).get(SHOWS[0]!)).toEqual([
      expect.objectContaining({ episodeNumber: 2, seasonNumber: 1 }),
    ]);
  });

  it('are built by the nightly job, after which the years list reads them instead of every watched item', async () => {
    seedUser({ country: 'GB' });
    db.seed(
      'Watched',
      Array.from({ length: 600 }, (_, index) =>
        watchedItem(
          1000 + (index % 25),
          1,
          1 + Math.floor(index / 25),
          Date.UTC(2020, 0, 1) + index * 3_600_000,
        ),
      ),
    );
    const before = await measureReads(() =>
      request(`/user/${USER_ID}/stats/years`),
    );
    const beforeJson = await before.result.json();
    await runNightly();
    expect(await readAllRollups(USER_ID)).not.toBeNull();
    // the years list's own cache entry would answer: clear it
    await db.send({
      constructor: { name: 'DeleteItemCommand' },
      input: {
        Key: marshall({ pk: `CACHE#stats:${USER_ID}:0:all-time:v3` }),
        TableName: 'Cache',
      },
    } as never);
    const after = await measureReads(() =>
      request(`/user/${USER_ID}/stats/years`),
    );

    expect(await after.result.json()).toEqual(beforeJson);
    console.log(
      `[ROLLUP-READS] years list, 600 episodes / 25 shows: ${before.report.rru.Watched} RRU of Watched -> ${after.report.rru.Lists} RRU of summaries`,
    );
    expect(after.report.rru.Watched ?? 0).toBe(0);
  });

  it('a show too big for one item falls back to reading it, and stays correct', async () => {
    seedUser();
    db.seed(
      'Watched',
      Array.from({ length: 5001 }, (_, index) =>
        watchedItem(
          77,
          1 + Math.floor(index / 999),
          1 + (index % 999),
          Date.UTC(2010, 0, 1) + index * 86_400_000,
        ),
      ),
    );
    await runNightly();
    expect((await readAllRollups(USER_ID))?.get(77)).toBe('overflow');
    expect((await readShowItems(USER_ID, [77])).get(77)).toHaveLength(5001);
  });

  it('keeps a 40-season, 900-episode show small (DynamoDB’s limit is 400 KB)', async () => {
    seedUser();
    db.seed(
      'Watched',
      Array.from({ length: 900 }, (_, index) =>
        watchedItem(
          88,
          1 + Math.floor(index / 23),
          1 + (index % 23),
          Date.UTC(2015, 0, 1) + index * 86_400_000,
        ),
      ),
    );
    await runNightly();
    const item = db.dump('Lists').find((row) => row.sk === 'AGG#SHOW#88');
    // DynamoDB's item size: attribute names plus values (a number is about
    // half its digits plus one, a list adds a byte per element)
    const size = (value: unknown): number =>
      typeof value === 'number'
        ? Math.ceil(String(Math.abs(value)).length / 2) + 1
        : typeof value === 'string'
          ? value.length
          : Array.isArray(value)
            ? 3 + value.reduce((sum: number, v) => sum + 1 + size(v), 0)
            : 1;
    const bytes = Object.entries(item ?? {}).reduce(
      (sum, [name, value]) => sum + name.length + size(value),
      0,
    );
    console.log(
      `[SIZE] summary of a 40-season, 900-episode show: ${bytes} bytes`,
    );
    expect(bytes).toBeLessThan(40_000);
  });

  it('a show unmarked after the nightly read stays empty (the older write loses to a tombstone)', async () => {
    seedUser();
    const show = SHOWS[0]!;
    const items = [
      { episodeNumber: 1, seasonNumber: 1, watchedAt: Date.UTC(2025, 0, 1) },
    ];
    // T0: the nightly job reads the partition (the show has an item)
    const nightlyRead = 1_000;
    await writeRollup(USER_ID, show, items, 500);
    // T1: the user removes every episode; the mark request writes the
    // show's (empty) summary from its newer read
    expect(await writeRollup(USER_ID, show, [], 2_000)).toBe(true);
    // ...then the nightly job writes what it read at T0
    await buildRollups(USER_ID, new Map([[show, { items }]]), nightlyRead);

    expect((await readShowItems(USER_ID, [show])).get(show)).toEqual([]);
    expect(await writeRollup(USER_ID, show, items, nightlyRead)).toBe(false);
  });

  it('a nightly run for an account with nothing left writes no completion row', async () => {
    seedUser();

    await buildRollups(USER_ID, new Map(), Date.now());

    expect(
      db.dump('Lists').filter((item) => String(item.sk).startsWith('AGG#')),
    ).toEqual([]);
  });
});
