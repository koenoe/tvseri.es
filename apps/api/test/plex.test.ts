import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore';
import type { SQSEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db, sqsMessages } from './db';
import { requestedUrls, resetRequests } from './fakeHttp';
import { measureReads } from './readUnits';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const TOKEN = 'abcdefabcdefabcdefabcdef';
const SCROBBLE_QUEUE = 'https://sqs.test/scrobble';

/** Edge key-value store updates: puts and deletes per call */
const kvsUpdates: Array<Readonly<{ puts: string[]; deletes: string[] }>> = [];
/** The edge store's keys (key -> provider) */
const edgeKeys = new Map<string, string>();
/** Set to make the next edge writes fail */
let edgeWritesFail = false;

beforeEach(() => {
  kvsUpdates.length = 0;
  edgeKeys.clear();
  edgeWritesFail = false;
  vi.spyOn(CloudFrontKeyValueStoreClient.prototype, 'send').mockImplementation(
    (async (command: {
      constructor: { name: string };
      input: {
        Puts?: Array<{ Key: string; Value: string }>;
        Deletes?: Array<{ Key: string }>;
      };
    }) => {
      switch (command.constructor.name) {
        case 'DescribeKeyValueStoreCommand':
          return { ETag: 'etag' };
        default: {
          if (edgeWritesFail) {
            throw Object.assign(new Error('throttled'), {
              name: 'ThrottlingException',
            });
          }
          const puts = command.input.Puts ?? [];
          const deletes = command.input.Deletes ?? [];
          for (const { Key } of deletes) {
            edgeKeys.delete(Key);
          }
          for (const { Key, Value } of puts) {
            edgeKeys.set(Key, Value);
          }
          kvsUpdates.push({
            deletes: deletes.map(({ Key }) => Key),
            puts: puts.map(({ Key }) => Key),
          });
          return {};
        }
      }
    }) as never,
  );
});

/** A token from before the edge check: no `edgeAt`, no key at the edge */
const seedLegacyToken = (
  token = TOKEN,
  userId = USER_ID,
  createdAt = '2025-10-17T00:00:00.000Z',
) =>
  db.seed('WebhookTokens', [
    {
      createdAt,
      gsi1pk: `USER#${userId}#TYPE#plex`,
      pk: `TOKEN#${token}`,
      token,
      type: 'plex',
      userId,
    },
  ]);

/** A token made since the edge check: its key is at the edge */
const seedToken = (extra: Record<string, unknown> = {}) => {
  edgeKeys.set(`wh:${TOKEN}`, 'plex');
  db.seed('WebhookTokens', [
    {
      createdAt: '2026-01-01T00:00:00.000Z',
      edgeAt: Date.UTC(2026, 0, 1),
      edgeStore: 'test',
      gsi1pk: `USER#${USER_ID}#TYPE#plex`,
      pk: `TOKEN#${TOKEN}`,
      token: TOKEN,
      type: 'plex',
      userId: USER_ID,
      ...extra,
    },
  ]);
};

const tokenRows = () => db.dump('WebhookTokens');

const EPISODE_METADATA: Record<string, unknown> = {
  grandparentTitle: 'Severance',
  index: 2,
  librarySectionType: 'show',
  parentIndex: 2,
  title: 'Goodbye, Mrs. Selvig',
  type: 'episode',
};

const plexScrobble = (
  accountId: number,
  title: string,
  metadata: Record<string, unknown>,
) => {
  const form = new FormData();
  form.set(
    'payload',
    JSON.stringify({
      Account: { id: accountId, title },
      event: 'media.scrobble',
      Metadata: metadata,
    }),
  );
  return form;
};

const scrobble = (accountId = 1, title = 'wren', metadata = EPISODE_METADATA) =>
  // Through the app directly: the request helper only sends JSON
  import('@/app').then(({ default: app }) =>
    app.request(`/scrobble/provider/plex?token=${TOKEN}`, {
      body: plexScrobble(accountId, title, metadata),
      method: 'POST',
    }),
  );

const queuedScrobbles = () =>
  sqsMessages.filter((message) => message.queueUrl === SCROBBLE_QUEUE);

const status = async (as = USER_ID) =>
  (await request('/webhook/type/plex/status', { as })).json();

describe('B20d Plex status, pause, whose plays count, disconnect', () => {
  it('reports not connected without a token', async () => {
    seedUser();
    expect(await status()).toEqual({ connected: false });
  });

  it('records the last scrobble and the Plex account it came from', async () => {
    seedUser();
    seedToken();
    expect((await scrobble(1, 'wren')).status).toBe(200);
    expect(queuedScrobbles()).toHaveLength(1);
    expect(await status()).toMatchObject({
      connected: true,
      lastAccount: { id: 1, title: 'wren' },
      lastReceivedAt: expect.any(Number),
      onlyAccount: null,
      paused: false,
    });
  });

  it('lists recent Plex marks from the history', async () => {
    seedUser();
    seedToken();
    db.seed('Watched', [
      {
        episodeNumber: 2,
        gsi2pk: `USER#${USER_ID}#WATCHED`,
        gsi2sk: Date.UTC(2026, 10, 12, 21, 14),
        pk: `USER#${USER_ID}`,
        seasonNumber: 4,
        seriesId: 1,
        sk: 'SERIES#1#S004#E002',
        title: 'Slow Horses',
        userId: USER_ID,
        watchedAt: Date.UTC(2026, 10, 12, 21, 14),
        watchProviderName: 'Plex',
      },
      {
        episodeNumber: 1,
        gsi2pk: `USER#${USER_ID}#WATCHED`,
        gsi2sk: Date.UTC(2026, 10, 12, 22),
        pk: `USER#${USER_ID}`,
        seasonNumber: 1,
        seriesId: 2,
        sk: 'SERIES#2#S001#E001',
        title: 'Marked by hand',
        userId: USER_ID,
        watchedAt: Date.UTC(2026, 10, 12, 22),
        watchProviderName: null,
      },
    ]);
    expect((await status()).recent).toEqual([
      {
        episodeNumber: 2,
        seasonNumber: 4,
        seriesId: 1,
        title: 'Slow Horses',
        watchedAt: Date.UTC(2026, 10, 12, 21, 14),
      },
    ]);
  });

  it('reads every Plex mark of the week behind a day of hand marks', async () => {
    seedUser();
    seedToken();
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    let episode = 0;
    const mark = (at: number, provider: string | null) => {
      episode += 1;
      return {
        episodeNumber: episode,
        gsi2pk: `USER#${USER_ID}#WATCHED`,
        gsi2sk: at,
        pk: `USER#${USER_ID}`,
        posterPath: '/p.jpg',
        seasonNumber: 1,
        seriesId: 1,
        sk: `SERIES#1#S001#E${String(episode).padStart(3, '0')}`,
        slug: 'severance',
        title: 'Severance',
        userId: USER_ID,
        watchedAt: at,
        watchProviderName: provider,
      };
    };
    // Plex marks per day ago, as on a real account: 2, 3, 6, 1, 4, 0, 2
    const perDay = [2, 3, 6, 1, 4, 0, 2];
    const plex = perDay.flatMap((count, day) =>
      Array.from({ length: count }, (_, i) =>
        mark(now - day * 24 * HOUR - (i + 1) * HOUR, 'Plex'),
      ),
    );
    db.seed('Watched', [
      ...plex,
      // 60 hand marks today, newer than every Plex mark: the filter runs
      // after a page's Limit, so these fill the first page
      ...Array.from({ length: 60 }, (_, i) => mark(now - i * 1000, null)),
      // 150 more hand marks spread over the week
      ...Array.from({ length: 150 }, (_, i) =>
        mark(now - 30 * 60_000 - i * 60 * 60_000, null),
      ),
      // older than the week: in `recent` only when the week is short
      mark(now - 10 * 24 * HOUR, 'Plex'),
    ]);

    const { result, report } = await measureReads(() => status());
    expect(result.week).toHaveLength(18);
    expect(result.week.map((m: { watchedAt: number }) => m.watchedAt)).toEqual(
      plex.map((m) => m.watchedAt).sort((a, b) => b - a),
    );
    expect(result.recent).toHaveLength(5);
    expect(result.recent).toEqual(result.week.slice(0, 5));
    // the token row, then the marks' pages (every one under the cap)
    expect(report.commands.QueryCommand).toBeLessThanOrEqual(1 + 20);
  });

  it('the latest list reaches past a quiet week, with episode names', async () => {
    seedUser();
    seedToken();
    const now = Date.now();
    db.seed('Watched', [
      {
        episodeNumber: 9,
        episodeTitle: 'The After Hours',
        gsi2pk: `USER#${USER_ID}#WATCHED`,
        gsi2sk: now - 20 * 24 * 60 * 60 * 1000,
        pk: `USER#${USER_ID}`,
        seasonNumber: 2,
        seriesId: 1,
        sk: 'SERIES#1#S002#E009',
        title: 'Severance',
        userId: USER_ID,
        watchedAt: now - 20 * 24 * 60 * 60 * 1000,
        watchProviderName: 'Plex',
      },
    ]);
    const body = await status();
    expect(body.week).toEqual([]);
    expect(body.recent).toEqual([
      {
        episodeNumber: 9,
        episodeTitle: 'The After Hours',
        seasonNumber: 2,
        seriesId: 1,
        title: 'Severance',
        watchedAt: now - 20 * 24 * 60 * 60 * 1000,
      },
    ]);
  });

  it('pauses: plays are not marked while paused', async () => {
    seedUser();
    seedToken();
    const paused = await request('/webhook/type/plex', {
      as: USER_ID,
      body: { paused: true },
      method: 'PATCH',
    });
    expect(paused.status).toBe(200);
    expect(await paused.json()).toMatchObject({ paused: true });
    expect((await scrobble()).status).toBe(200);
    expect(queuedScrobbles()).toEqual([]);
  });

  it("only counts the chosen account's plays", async () => {
    seedUser();
    seedToken();
    await scrobble(1, 'wren');
    expect(queuedScrobbles()).toHaveLength(1);

    const unknown = await request('/webhook/type/plex', {
      as: USER_ID,
      body: { onlyAccountId: 7 },
      method: 'PATCH',
    });
    expect(unknown.status).toBe(400);

    const only = await request('/webhook/type/plex', {
      as: USER_ID,
      body: { onlyAccountId: 1 },
      method: 'PATCH',
    });
    expect(await only.json()).toMatchObject({
      onlyAccount: { id: 1, title: 'wren' },
    });
    await scrobble(7, 'guest');
    expect(queuedScrobbles()).toHaveLength(1);
    await scrobble(1, 'wren');
    expect(queuedScrobbles()).toHaveLength(2);

    await request('/webhook/type/plex', {
      as: USER_ID,
      body: { onlyAccountId: null },
      method: 'PATCH',
    });
    await scrobble(7, 'guest');
    expect(queuedScrobbles()).toHaveLength(3);
    expect(await status()).toMatchObject({
      lastAccount: { id: 7, title: 'guest' },
      onlyAccount: null,
    });
  });

  it('rejects settings without a token, and bad input', async () => {
    seedUser();
    const missing = await request('/webhook/type/plex', {
      as: USER_ID,
      body: { paused: true },
      method: 'PATCH',
    });
    expect(missing.status).toBe(404);
    seedToken();
    const bad = await request('/webhook/type/plex', {
      as: USER_ID,
      body: { paused: 'yes' },
      method: 'PATCH',
    });
    expect(bad.status).toBe(400);
  });

  it('disconnects: removes the edge key and the token row; safe to repeat', async () => {
    seedUser();
    seedToken();
    const response = await request('/webhook/type/plex', {
      as: USER_ID,
      method: 'DELETE',
    });
    expect(response.status).toBe(200);
    expect(kvsUpdates).toEqual([
      { deletes: [expect.stringContaining(TOKEN)], puts: [] },
    ]);
    expect(await status()).toEqual({ connected: false });

    const again = await request('/webhook/type/plex', {
      as: USER_ID,
      method: 'DELETE',
    });
    expect(again.status).toBe(200);
  });

  it("never touches another user's token", async () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID, username: 'other' });
    seedToken();
    await request('/webhook/type/plex', {
      as: OTHER_USER_ID,
      method: 'DELETE',
    });
    expect(await status()).toMatchObject({ connected: true });
  });

  it('keeps pause and the chosen account on a new URL', async () => {
    seedUser();
    seedToken({ onlyAccount: { id: 1, title: 'wren' }, paused: true });
    const created = await request('/webhook/type/plex', {
      as: USER_ID,
      method: 'POST',
    });
    expect(created.status).toBe(201);
    expect(await status()).toMatchObject({
      onlyAccount: { id: 1, title: 'wren' },
      paused: true,
    });
  });
});

describe('Plex URLs and the edge store', () => {
  it('a token from before the edge check works again on the next status read', async () => {
    seedUser();
    seedLegacyToken();
    expect(await status()).toMatchObject({ connected: true, urlWorks: true });
    expect(edgeKeys.get(`wh:${TOKEN}`)).toBe('plex');
    expect(tokenRows()[0]).toMatchObject({ edgeAt: expect.any(Number) });

    // Repaired once: the next read writes nothing
    kvsUpdates.length = 0;
    expect(await status()).toMatchObject({ urlWorks: true });
    expect(kvsUpdates).toEqual([]);
  });

  it('says the URL is not working while its missing key cannot be written', async () => {
    seedUser();
    seedLegacyToken();
    edgeWritesFail = true;
    expect(await status()).toMatchObject({ connected: true, urlWorks: false });
    expect(tokenRows()[0]?.edgeAt).toBeUndefined();

    edgeWritesFail = false;
    expect(await status()).toMatchObject({ urlWorks: true });
  });

  it('a new token has its key at the edge and its row stamped', async () => {
    seedUser();
    const created = await request('/webhook/type/plex', {
      as: USER_ID,
      method: 'POST',
    });
    const { token } = (await created.json()) as { token: string };
    expect(edgeKeys.get(`wh:${token}`)).toBe('plex');
    expect(tokenRows()[0]).toMatchObject({ edgeAt: expect.any(Number) });

    kvsUpdates.length = 0;
    expect(await status()).toMatchObject({ urlWorks: true });
    expect(kvsUpdates).toEqual([]);
  });

  it('a new URL for a token from before the edge check swaps the keys', async () => {
    seedUser();
    seedLegacyToken();
    const created = await request('/webhook/type/plex', {
      as: USER_ID,
      method: 'POST',
    });
    const { token } = (await created.json()) as { token: string };
    expect([...edgeKeys.keys()]).toEqual([`wh:${token}`]);
    expect(kvsUpdates).toEqual([
      { deletes: [`wh:${TOKEN}`], puts: [`wh:${token}`] },
    ]);
    expect(tokenRows()).toHaveLength(1);
  });

  it('disconnect removes the key of a repaired token', async () => {
    seedUser();
    seedLegacyToken();
    await status();
    await request('/webhook/type/plex', { as: USER_ID, method: 'DELETE' });
    expect(edgeKeys.size).toBe(0);
    expect(tokenRows()).toEqual([]);
  });

  it('a token marked for a replaced edge store gets its key again', async () => {
    seedUser();
    seedToken({ edgeStore: 'replaced-store' });
    edgeKeys.clear();
    expect(await status()).toMatchObject({ urlWorks: true });
    expect(edgeKeys.get(`wh:${TOKEN}`)).toBe('plex');
    expect(tokenRows()[0]).toMatchObject({ edgeStore: 'test' });
  });

  it('a token marked for the current store costs no edge call', async () => {
    seedUser();
    seedToken();
    expect(await status()).toMatchObject({ urlWorks: true });
    expect(kvsUpdates).toEqual([]);
  });
});

describe('one token per user and provider', () => {
  const OLD_TOKEN = '111111111111111111111111';

  /** A second row for the user (two overlapping creates before this fix) */
  const seedSecondToken = () => {
    edgeKeys.set(`wh:${OLD_TOKEN}`, 'plex');
    seedLegacyToken(OLD_TOKEN);
  };

  const ownRows = () => tokenRows().filter((row) => row.userId === USER_ID);

  it('disconnect removes every row and every edge key of the user', async () => {
    seedUser();
    seedToken();
    seedSecondToken();

    const response = await request('/webhook/type/plex', {
      as: USER_ID,
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    expect(ownRows()).toEqual([]);
    expect([...edgeKeys.keys()]).toEqual([]);
  });

  it('disconnect leaves another user’s row alone', async () => {
    seedUser();
    seedToken();
    seedLegacyToken(OLD_TOKEN, OTHER_USER_ID);

    await request('/webhook/type/plex', { as: USER_ID, method: 'DELETE' });

    expect(tokenRows()).toEqual([
      expect.objectContaining({ userId: OTHER_USER_ID }),
    ]);
  });

  it('a new URL replaces every row the user had', async () => {
    seedUser();
    seedToken();
    seedSecondToken();

    const created = await request('/webhook/type/plex', {
      as: USER_ID,
      method: 'POST',
    });
    const { token } = (await created.json()) as { token: string };

    expect(ownRows()).toEqual([expect.objectContaining({ token })]);
    expect([...edgeKeys.keys()]).toEqual([`wh:${token}`]);
  });

  it('two overlapping creates leave one row and one edge key', async () => {
    seedUser();
    seedToken();

    const responses = await Promise.all([
      request('/webhook/type/plex', { as: USER_ID, method: 'POST' }),
      request('/webhook/type/plex', { as: USER_ID, method: 'POST' }),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(ownRows()).toHaveLength(1);
    expect([...edgeKeys.keys()]).toEqual([`wh:${ownRows()[0]?.token}`]);
  });

  it('account deletion removes every row of the user', async () => {
    process.env.DELETE_ACCOUNT_ENABLED = 'true';
    const user = seedUser();
    seedToken();
    seedSecondToken();

    const response = await request('/me', {
      as: USER_ID,
      body: { confirm: user.username },
      method: 'DELETE',
    });

    expect(response.status).toBe(202);
    expect(ownRows()).toEqual([]);
    expect([...edgeKeys.keys()]).toEqual([]);
    delete process.env.DELETE_ACCOUNT_ENABLED;
  });
});

describe('Plex scrobble payloads', () => {
  it('queues only what the scrobble Lambda reads', async () => {
    seedUser();
    seedToken();
    const response = await scrobble(1, 'wren', {
      ...EPISODE_METADATA,
      Guid: [{ id: 'imdb://tt11280740' }, { id: 'tvdb://8016345' }],
      librarySectionTitle: 'TV Shows',
      Player: { publicAddress: '203.0.113.7' },
      summary: 'Mark ventures into the unknown.',
      thumb: '/library/metadata/1/thumb/1',
      year: 2025,
    });

    expect(response.status).toBe(200);
    expect(queuedScrobbles().map(({ body }) => body)).toEqual([
      {
        metadata: {
          plex: {
            Guid: [{ id: 'imdb://tt11280740' }, { id: 'tvdb://8016345' }],
            grandparentTitle: 'Severance',
            index: 2,
            parentIndex: 2,
            year: 2025,
          },
        },
        userId: USER_ID,
      },
    ]);
  });

  it('refuses an episode whose numbers are not numbers, and queues nothing', async () => {
    seedUser();
    seedToken();
    for (const metadata of [
      { ...EPISODE_METADATA, index: '2/../../../4/list/1' },
      { ...EPISODE_METADATA, parentIndex: -1 },
      { ...EPISODE_METADATA, grandparentTitle: { $gt: '' } },
      { ...EPISODE_METADATA, index: 2.5 },
      { ...EPISODE_METADATA, Guid: 'imdb://tt11280740' },
    ]) {
      expect((await scrobble(1, 'wren', metadata)).status).toBe(400);
    }
    expect(queuedScrobbles()).toEqual([]);
  });

  it('the Lambda drops a malformed queued scrobble without asking TMDB', async () => {
    const { handler } = await import('@/lambdas/scrobble');
    resetRequests();
    const result = await handler({
      Records: [
        {
          attributes: { SentTimestamp: String(Date.UTC(2026, 0, 1)) },
          body: JSON.stringify({
            metadata: {
              plex: { ...EPISODE_METADATA, parentIndex: '1/../../x' },
            },
            userId: USER_ID,
          }),
          messageId: 'm1',
        },
      ],
    } as unknown as SQSEvent);

    expect(result).toEqual({ batchItemFailures: [] });
    expect(requestedUrls()).toEqual([]);
    expect(db.dump('Watched')).toEqual([]);
  });
});
