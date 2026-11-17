import type { DynamoDBStreamEvent, SQSEvent } from 'aws-lambda';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeShow } from './fixtures/tmdb';
import { lambdaContext } from './lambdaContext';
import { seedUser, USER_ID } from './seed';

/**
 * The watched stream, the Plex scrobble queue and the nightly status queue
 * never call MDBList: they reach `lib/mdblist` only through `lib/tmdb`'s
 * imports. With the key read on first use, they load and run without the
 * `MdblistApiKey` link (SST throws "not linked" for a resource a Lambda
 * doesn't link, which is what the missing entry below reproduces), and
 * infra no longer links it to them. Only the API functions (catalogue:
 * lists for trending, Home, go-deeper, spotlight) call MDBList.
 */
type Raw = Record<string, unknown>;
const raw = () =>
  (globalThis as unknown as { __SST_RESOURCE_RAW__: Raw }).__SST_RESOURCE_RAW__;

describe('Lambdas without the MdblistApiKey link', () => {
  let saved: unknown;

  afterEach(() => {
    raw().MdblistApiKey = saved;
  });

  it('load the stream, scrobble and nightly handlers, and run a stream batch and a night', async () => {
    seedUser();
    fakeShow({ id: 9701, seasons: [{ airDate: '2020-01-01', episodes: 3 }] });
    // Load SST's links first (they load on first use), then unlink the key
    const { Resource } = await import('sst');
    expect(Resource.App).toBeDefined();
    saved = raw().MdblistApiKey;
    delete raw().MdblistApiKey;
    vi.resetModules();

    const { handler: stream } = await import('@/lambdas/watched');
    await import('@/lambdas/scrobble');
    const { handler: nightly } = await import(
      '@/lambdas/validateWatchedStatusQueue'
    );
    const { marshall } = await import('@aws-sdk/util-dynamodb');
    const item = {
      episodeNumber: 1,
      pk: `USER#${USER_ID}`,
      seasonNumber: 1,
      seriesId: 9701,
      sk: 'SERIES#9701#S001#E001',
      userId: USER_ID,
      watchedAt: Date.UTC(2025, 0, 1),
    };

    await expect(
      stream({
        Records: [
          {
            dynamodb: { NewImage: marshall(item) as never },
            eventName: 'INSERT',
          },
        ],
      } as DynamoDBStreamEvent),
    ).resolves.not.toThrow();
    await expect(
      nightly(
        {
          Records: [{ body: JSON.stringify({ id: USER_ID }), messageId: 'm' }],
        } as unknown as SQSEvent,
        lambdaContext(),
      ),
    ).resolves.toBeDefined();
    // Loading three handlers' module graphs takes seconds on a busy machine
  }, 30_000);
});
