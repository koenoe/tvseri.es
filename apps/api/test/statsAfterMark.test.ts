import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { handler } from '@/lambdas/watched';
import { db } from './db';
import { fakeShow } from './fixtures/tmdb';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const SHOW = 5151;

const record = (userId: string, episode: number, watchedAt: number) => ({
  dynamodb: {
    NewImage: marshall({
      episodeNumber: episode,
      runtime: 30,
      seasonNumber: 1,
      seriesId: SHOW,
      userId,
      watchedAt,
    }),
  },
  eventName: 'INSERT',
});

const stream = (records: ReadonlyArray<ReturnType<typeof record>>) =>
  handler({ Records: records } as unknown as DynamoDBStreamEvent);

describe('a mark and the stats cache', () => {
  it('leaves the year sections cached (24 h, the stats profile); only the years list is cleared', async () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID });
    fakeShow({ id: SHOW, seasons: [{ airDate: '2020-01-01', episodes: 10 }] });
    const year = `CACHE#stats:${USER_ID}:2025:weekly`;
    const allTime = `CACHE#stats:${USER_ID}:0:all-time:v3`;
    db.seed('Cache', [
      { pk: year, value: '[]' },
      { pk: allTime, value: '{}' },
    ]);

    await stream([
      record(USER_ID, 1, Date.UTC(2025, 0, 1)),
      record(OTHER_USER_ID, 1, Date.UTC(2025, 0, 1)),
    ]);

    const left = db.dump('Cache');
    expect(left.map((item) => item.pk)).toContain(year);
    // cleared as of the mark: no value, only the time a read must beat
    const cleared = left.find((item) => item.pk === allTime);
    expect(cleared?.value ?? null).toBeNull();
    expect(typeof cleared?.asOf).toBe('number');
  });
});
