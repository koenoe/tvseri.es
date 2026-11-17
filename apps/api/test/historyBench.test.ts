import { marshall } from '@aws-sdk/util-dynamodb';
import type { SQSEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { handler as nightly } from '@/lambdas/validateWatchedStatusQueue';

import { db } from './db';
import { measureReads } from './readUnits';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

/**
 * A measurement (not a fix): what the years list costs to build for a
 * heavy history on the in-memory double, and what History reads before it
 * can draw. W = 6,000 regular episodes over 8 years, S = 250 shows. Items
 * carry every attribute a real mark writes, so their size is realistic.
 * Pages are 1 MB Query pages, from the bytes read (the double doesn't page).
 */
const W = 6000;
const SHOWS = 250;
const pad = (n: number) => String(n).padStart(3, '0');

const seedHeavyHistory = () => {
  const start = Date.UTC(2018, 0, 1);
  const span = Date.UTC(2026, 0, 1) - start;
  db.seed(
    'Watched',
    Array.from({ length: W }, (_, index) => {
      const seriesId = 1000 + (index % SHOWS);
      const episode = Math.floor(index / SHOWS) + 1;
      const watchedAt = start + Math.floor((index / W) * span);
      return {
        episodeAirDate: '2019-03-04T00:00:00.000Z',
        episodeNumber: episode,
        episodeStillPath: `/still-${seriesId}-${episode}.jpg`,
        episodeTitle: `Episode ${episode} of a series with a title`,
        gsi1pk: `USER#${USER_ID}#SERIES#${seriesId}`,
        gsi1sk: `S001#E${pad(episode)}`,
        gsi2pk: `USER#${USER_ID}#WATCHED`,
        gsi2sk: watchedAt,
        pk: `USER#${USER_ID}`,
        posterPath: `/poster-${seriesId}.jpg`,
        runtime: 45,
        seasonNumber: 1,
        seriesId,
        sk: `SERIES#${seriesId}#S001#E${pad(episode)}`,
        slug: `series-${seriesId}`,
        title: `Series ${seriesId}`,
        userId: USER_ID,
        watchedAt,
        watchProviderLogoPath: '/netflix.jpg',
        watchProviderName: 'Netflix',
      };
    }),
  );
};

const MB = 1024 * 1024;

describe('measurement: the years list for a 6,000-episode history', () => {
  it('reports reads and time for /stats/years and for what History waits on', async () => {
    seedUser({ country: 'GB' });
    seedHeavyHistory();

    const started = performance.now();
    const years = await measureReads(() =>
      request(`/user/${USER_ID}/stats/years`),
    );
    const yearsMs = performance.now() - started;
    expect(years.result.status).toBe(200);

    const diary = await measureReads(() =>
      request(`/user/${USER_ID}/watched?limit=100`, { as: USER_ID }),
    );
    const zone = await measureReads(() =>
      request(`/user/${USER_ID}/stats/zone`),
    );
    // This week when the diary doesn't reach Monday: the daily segment of the year (750 here)
    const daily = await measureReads(() =>
      request(`/user/${USER_ID}/stats/2025/daily`),
    );

    const watchedBytes = years.report.bytes.Watched ?? 0;
    const report = {
      dailyRru: daily.report.totalRru,
      diaryFirstPageRru: diary.report.totalRru,
      yearsItemsRead: W,
      yearsMs: Math.round(yearsMs),
      yearsPages1Mb: Math.ceil(watchedBytes / MB),
      yearsRru: years.report.totalRru,
      yearsWatchedBytes: watchedBytes,
      zoneRru: zone.report.totalRru,
    };
    console.log(`[BENCH] ${JSON.stringify(report)}`);
    expect(report.yearsPages1Mb).toBeGreaterThan(1);

    // After the nightly job built the per-show summaries, and a
    // mark cleared the years list's cache entry
    await nightly({
      Records: [{ body: JSON.stringify({ id: USER_ID }), messageId: 'm' }],
    } as unknown as SQSEvent);
    await db.send({
      constructor: { name: 'DeleteItemCommand' },
      input: {
        Key: marshall({ pk: `CACHE#stats:${USER_ID}:0:all-time:v3` }),
        TableName: 'Cache',
      },
    } as never);
    const startedAfter = performance.now();
    const after = await measureReads(() =>
      request(`/user/${USER_ID}/stats/years`),
    );
    const afterMs = performance.now() - startedAfter;
    expect(await after.result.json()).toEqual(await years.result.json());
    console.log(
      `[BENCH-AFTER] ${JSON.stringify({
        listsBytes: after.report.bytes.Lists,
        rru: after.report.totalRru,
        watchedRru: after.report.rru.Watched ?? 0,
        yearsMs: Math.round(afterMs),
      })}`,
    );
  });
});
