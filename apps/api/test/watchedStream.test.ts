import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { handler } from '@/lambdas/watched';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

type Mark = Readonly<{ season: number; episode: number }>;

// The subscriber keeps TMDB series in a module cache: one id per test
let SHOW = 4242;

const item = ({ episode, season }: Mark) => ({
  episodeNumber: episode,
  runtime: 30,
  seasonNumber: season,
  seriesId: SHOW,
  userId: USER_ID,
  watchedAt: Date.UTC(2025, 0, 1),
});

/** Marks through the API, then runs the stream subscriber on the inserts */
const markAndStream = async (marks: ReadonlyArray<Mark>) => {
  for (const mark of marks) {
    const response = await request(
      `/user/${USER_ID}/watched/series/${SHOW}/season/${mark.season}/episode/${mark.episode}`,
      { as: USER_ID, body: { watchProvider: null }, method: 'POST' },
    );
    expect(response.status).toBe(201);
  }
  const event = {
    Records: marks.map((mark) => ({
      dynamodb: { NewImage: marshall(item(mark)) },
      eventName: 'INSERT',
    })),
  } as unknown as DynamoDBStreamEvent;
  await handler(event);
};

const libraryIds = async () =>
  (await request('/me/library-ids', { as: USER_ID })).json();

describe('watched stream list sync', () => {
  it('moves a show to Watched when the last aired episode is marked', async () => {
    SHOW = 4242;
    seedUser();
    fakeShow({ id: SHOW, seasons: [{ airDate: '2020-01-01', episodes: 2 }] });
    await markAndStream([{ episode: 1, season: 1 }]);
    expect(await libraryIds()).toMatchObject({
      inProgress: [SHOW],
      watched: [],
    });

    await markAndStream([{ episode: 2, season: 1 }]);
    expect(await libraryIds()).toMatchObject({
      inProgress: [],
      watched: [SHOW],
    });
  });

  it("doesn't count specials towards finishing a show", async () => {
    SHOW = 4243;
    seedUser();
    fakeShow({
      id: SHOW,
      seasons: [{ airDate: '2020-01-01', episodes: 2 }],
      specials: { airDate: '2020-06-01', episodes: 2 },
    });
    await markAndStream([
      { episode: 1, season: 1 },
      { episode: 1, season: 0 },
      { episode: 2, season: 0 },
    ]);
    expect(await libraryIds()).toMatchObject({
      inProgress: [SHOW],
      watched: [],
    });
  });
});
