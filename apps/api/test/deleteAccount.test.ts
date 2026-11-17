import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore';
import { WEBHOOK_TOKEN_KV_PREFIX } from '@tvseri.es/constants';
import { authRefreshPartition, authSubject, emailKey } from '@tvseri.es/utils';
import type { Context, SQSEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handler as deleteAccount } from '@/lambdas/deleteAccount';
import { db, sqsMessages } from './db';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const QUEUE = 'https://sqs.test/delete-account';

/** Every edge-store command sent, by name and input */
let edgeCommands: Array<{ name: string; input: unknown }> = [];

beforeEach(() => {
  edgeCommands = [];
  vi.spyOn(CloudFrontKeyValueStoreClient.prototype, 'send').mockImplementation(
    (async (command: { constructor: { name: string }; input: unknown }) => {
      edgeCommands.push({
        input: command.input,
        name: command.constructor.name,
      });
      return command.constructor.name === 'DescribeKeyValueStoreCommand'
        ? { ETag: 'etag' }
        : {};
    }) as never,
  );
});

const queued = () =>
  sqsMessages.filter((message) => message.queueUrl === QUEUE);

/** Runs the queue Lambda on everything queued for it so far */
const runQueue = async (remainingMs = 300_000) => {
  const messages = queued();
  sqsMessages.length = 0;
  return deleteAccount(
    {
      Records: messages.map((message, index) => ({
        body: JSON.stringify(message.body),
        messageId: `m${index}`,
      })),
    } as unknown as SQSEvent,
    { getRemainingTimeInMillis: () => remainingMs } as unknown as Context,
  );
};

const watchedItem = (userId: string, seriesId: number, episode: number) => ({
  episodeNumber: episode,
  gsi1pk: `USER#${userId}#SERIES#${seriesId}`,
  gsi1sk: `S001#E00${episode}`,
  gsi2pk: `USER#${userId}#WATCHED`,
  gsi2sk: episode,
  pk: `USER#${userId}`,
  seasonNumber: 1,
  seriesId,
  sk: `SERIES#${seriesId}#S001#E00${episode}`,
  userId,
  watchedAt: episode,
});

const follow = (follower: string, following: string) => ({
  createdAt: 1,
  followerId: follower,
  followingId: following,
  gsi1pk: `USER#${following}#FOLLOWERS`,
  gsi1sk: `1#${follower}`,
  gsi2pk: `USER#${follower}#FOLLOWING`,
  gsi2sk: `1#${following}`,
  pk: `FOLLOW#${follower}#${following}`,
  sk: `FOLLOW#${follower}#${following}`,
});

const seedEverything = () => {
  seedUser({ username: 'wren' });
  seedUser({ id: OTHER_USER_ID, username: 'other' });
  db.seed('Watched', [
    watchedItem(USER_ID, 1, 1),
    watchedItem(USER_ID, 1, 2),
    watchedItem(OTHER_USER_ID, 1, 1),
  ]);
  db.seed('Lists', [
    {
      gsi2pk: `LIST#${USER_ID}#WATCHLIST`,
      gsi2sk: 1,
      id: 5,
      pk: `USER#${USER_ID}`,
      sk: 'LIST#WATCHLIST#ITEM#5',
    },
    {
      pk: `USER#${USER_ID}`,
      sk: 'PREF#SERIES#1',
      skipped: new Set(['S01E03']),
    },
    {
      gsi2pk: `LIST#${OTHER_USER_ID}#WATCHLIST`,
      gsi2sk: 1,
      id: 5,
      pk: `USER#${OTHER_USER_ID}`,
      sk: 'LIST#WATCHLIST#ITEM#5',
    },
  ]);
  db.seed('Follow', [
    follow(USER_ID, OTHER_USER_ID),
    follow(OTHER_USER_ID, USER_ID),
  ]);
  db.seed('Cache', [
    { pk: `CACHE#profile:${USER_ID}:watched-runtime:v2`, value: 60 },
    { pk: `CACHE#profile:${USER_ID}:watched-runtime:v3`, value: 50 },
    { pk: `CACHE#stats:${USER_ID}:2025:metrics`, value: '{}' },
    { pk: `CACHE#stats:${USER_ID}:2025:weekly`, value: '{}' },
    { pk: `CACHE#profile:${OTHER_USER_ID}:watched-runtime:v2`, value: 30 },
  ]);
  db.seed('WebhookTokens', [
    {
      gsi1pk: `USER#${USER_ID}#TYPE#plex`,
      pk: 'TOKEN#abcdefabcdefabcdefabcdef',
      token: 'abcdefabcdefabcdefabcdef',
      type: 'plex',
      userId: USER_ID,
    },
  ]);
};

const keysOf = (table: string) =>
  db.dump(table).map((item) => `${item.pk}|${item.sk ?? ''}`);

describe('delete account', () => {
  it('needs the username typed to confirm', async () => {
    seedEverything();
    const response = await request('/me', {
      as: USER_ID,
      body: { confirm: 'koe' },
      method: 'DELETE',
    });
    expect(response.status).toBe(400);
    expect(queued()).toEqual([]);
    expect(keysOf('WebhookTokens')).toHaveLength(1);
  });

  it('needs a signed-in user', async () => {
    seedEverything();
    const response = await request('/me', {
      body: { confirm: 'wren' },
      method: 'DELETE',
    });
    expect(response.status).toBe(401);
    expect(queued()).toEqual([]);
    expect(keysOf('WebhookTokens')).toHaveLength(1);
  });

  it("deletes everything of the user, in steps, and nothing of anyone else's", async () => {
    seedEverything();
    const response = await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });
    expect(response.status).toBe(202);
    // The Plex link goes right away, at the edge too; the session stops working
    expect(keysOf('WebhookTokens')).toEqual([]);
    expect(edgeCommands).toContainEqual({
      input: expect.objectContaining({
        Deletes: [
          { Key: `${WEBHOOK_TOKEN_KV_PREFIX}abcdefabcdefabcdefabcdef` },
        ],
      }),
      name: 'UpdateKeysCommand',
    });
    const me = await request('/me', { as: USER_ID });
    expect(me.status).toBe(401);
    // Its own code: the web signs this session out, never one it couldn't verify
    expect(await me.json()).toMatchObject({ message: 'AccountGone' });

    // Step 1: follows and watched history
    await runQueue();
    expect(keysOf('Watched')).toEqual([
      `USER#${OTHER_USER_ID}|SERIES#1#S001#E001`,
    ]);
    expect(keysOf('Follow')).toEqual([]);
    expect(queued()).toEqual([
      expect.objectContaining({
        body: { step: 'lists', userId: USER_ID },
        delaySeconds: 900,
      }),
    ]);

    // Step 2, after the watched stream settled: lists, prefs, cache, user
    await runQueue();
    expect(keysOf('Lists')).toEqual([
      `USER#${OTHER_USER_ID}|LIST#WATCHLIST#ITEM#5`,
    ]);
    expect(keysOf('Cache')).toEqual([
      `CACHE#profile:${OTHER_USER_ID}:watched-runtime:v2|`,
    ]);
    expect(db.dump('Users').map((user) => user.id)).toEqual([OTHER_USER_ID]);

    // Step 3: one last sweep for rows the stream re-added meanwhile
    expect(queued()).toEqual([
      expect.objectContaining({
        body: { step: 'sweep', userId: USER_ID },
        delaySeconds: 900,
      }),
    ]);
    db.seed('Lists', [
      { pk: `USER#${USER_ID}`, sk: 'LIST#IN_PROGRESS#ITEM#1' },
    ]);
    await runQueue();
    expect(keysOf('Lists')).toEqual([
      `USER#${OTHER_USER_ID}|LIST#WATCHLIST#ITEM#5`,
    ]);
    expect(queued()).toEqual([]);
  });

  it('is safe to run any step again', async () => {
    seedEverything();
    await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });
    const first = queued()[0]!;
    await runQueue();
    sqsMessages.push(first);
    expect(await runQueue()).toEqual({ batchItemFailures: [] });
    await runQueue();
    sqsMessages.push({
      body: { step: 'lists', userId: USER_ID },
      queueUrl: QUEUE,
    });
    expect(await runQueue()).toEqual({ batchItemFailures: [] });
  });

  it('never deletes a user who did not ask for it', async () => {
    seedEverything();
    sqsMessages.push({
      body: { step: 'data', userId: USER_ID },
      queueUrl: QUEUE,
    });
    sqsMessages.push({
      body: { step: 'lists', userId: USER_ID },
      queueUrl: QUEUE,
    });
    await runQueue();
    expect(keysOf('Watched')).toHaveLength(3);
    expect(keysOf('Lists')).toHaveLength(3);
    expect(db.dump('Users')).toHaveLength(2);
  });

  it('continues in a new message when the Lambda runs out of time', async () => {
    seedEverything();
    await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });
    await runQueue(1_000);
    expect(queued()).toEqual([
      expect.objectContaining({ body: { step: 'data', userId: USER_ID } }),
    ]);
    expect(queued()[0]).not.toHaveProperty('delaySeconds');
  });
});

describe('when starting fails', () => {
  it('takes the request back so the user can retry', async () => {
    seedEverything();
    vi.spyOn(CloudFrontKeyValueStoreClient.prototype, 'send').mockRejectedValue(
      new Error('KVS down') as never,
    );
    const failed = await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });
    expect(failed.status).toBe(500);
    expect(queued()).toEqual([]);
    // Still signed in, so the retry can happen
    expect((await request('/me', { as: USER_ID })).status).toBe(200);
  });
});

describe('delete account: hidden profile, late follows, handle claim', () => {
  it('hides a profile whose account is being deleted', async () => {
    seedEverything();
    await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });
    expect((await request(`/user/${USER_ID}`)).status).toBe(404);
    expect((await request('/user/by-username/wren')).status).toBe(404);
  });

  it('sweeps follows made during the window, and refuses unknown steps', async () => {
    seedEverything();
    await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });
    await runQueue();
    db.seed('Follow', [follow(OTHER_USER_ID, USER_ID)]);
    sqsMessages.length = 0;
    sqsMessages.push({
      body: { step: 'sweep', userId: USER_ID },
      queueUrl: QUEUE,
    });
    await runQueue();
    expect(keysOf('Follow')).toEqual([]);

    sqsMessages.push({
      body: { step: 'everything', userId: OTHER_USER_ID },
      queueUrl: QUEUE,
    });
    await runQueue();
    expect(db.dump('Users').map((user) => user.id)).toContain(OTHER_USER_ID);
  });
});

describe('the handle claim', () => {
  it('goes with the account when it is the user’s own; any other claim stays', async () => {
    seedEverything();
    db.seed('Users', [
      { pk: 'HANDLE#wren', userId: USER_ID },
      { pk: 'HANDLE#other', userId: OTHER_USER_ID },
      // A claim from before claims named their user: whose is unknown
      { pk: 'HANDLE#calm-otter-412' },
    ]);
    await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });

    await runQueue(); // data
    await runQueue(); // lists, the user item and their claim

    expect(
      db
        .dump('Users')
        .map((item) => String(item.pk))
        .filter((pk) => pk.startsWith('HANDLE#'))
        .sort(),
    ).toEqual(['HANDLE#calm-otter-412', 'HANDLE#other']);
  });

  it('never takes a claim another user holds under the deleted user’s name', async () => {
    seedEverything();
    db.seed('Users', [{ pk: 'HANDLE#wren', userId: OTHER_USER_ID }]);
    await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });

    await runQueue();
    await runQueue();

    expect(db.dump('Users').some((item) => item.pk === 'HANDLE#wren')).toBe(
      true,
    );
  });
});

describe('the email claim', () => {
  it('goes with the account, so the address can sign up again; another user’s stays', async () => {
    seedEverything();
    db.seed('Users', [
      { pk: emailKey('wren@example.com'), userId: USER_ID },
      { pk: emailKey('other@example.com'), userId: OTHER_USER_ID },
    ]);
    await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });

    await runQueue(); // data
    await runQueue(); // lists, the user item and their claims

    expect(
      db
        .dump('Users')
        .map((item) => String(item.pk))
        .filter((pk) => pk.startsWith('EMAIL#')),
    ).toEqual([emailKey('other@example.com')]);
  });

  it('never takes a claim on the address that names another user', async () => {
    seedEverything();
    db.seed('Users', [
      { pk: emailKey('wren@example.com'), userId: OTHER_USER_ID },
    ]);
    await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });

    await runQueue();
    await runQueue();

    expect(
      db.dump('Users').some((item) => item.pk === emailKey('wren@example.com')),
    ).toBe(true);
  });
});

describe('the per-show summaries', () => {
  it('go with the account (the Lists partition), another user’s stay', async () => {
    seedEverything();
    db.seed('Lists', [
      {
        asOf: 1,
        c: [10001],
        pk: `USER#${USER_ID}`,
        r: [30],
        sk: 'AGG#SHOW#1',
        t: [1],
      },
      { pk: `USER#${USER_ID}`, sk: 'AGG#META', v: 1 },
      {
        asOf: 1,
        c: [10001],
        pk: `USER#${OTHER_USER_ID}`,
        r: [30],
        sk: 'AGG#SHOW#1',
        t: [1],
      },
    ]);
    await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });

    await runQueue();
    await runQueue();

    const agg = db
      .dump('Lists')
      .filter((item) => String(item.sk).startsWith('AGG#'))
      .map((item) => String(item.pk));
    expect(agg).toEqual([`USER#${OTHER_USER_ID}`]);
  });
});

describe('the sign-ins', () => {
  const signIn = async (userId: string, role: 'admin' | 'user', n: number) => ({
    pk: authRefreshPartition(await authSubject(userId, role)),
    sk: `token-${n}`,
  });

  it('go with the account (for every role signed in with), another user’s stay', async () => {
    seedEverything();
    const other = await signIn(OTHER_USER_ID, 'user', 3);
    db.seed('AuthSignIns', [
      await signIn(USER_ID, 'user', 1),
      await signIn(USER_ID, 'admin', 2),
      other,
    ]);
    await request('/me', {
      as: USER_ID,
      body: { confirm: 'wren' },
      method: 'DELETE',
    });

    await runQueue();
    expect(db.dump('AuthSignIns')).toHaveLength(3);
    await runQueue();
    expect(keysOf('AuthSignIns')).toEqual([`${other.pk}|${other.sk}`]);

    // One made during the window goes with the sweep
    db.seed('AuthSignIns', [await signIn(USER_ID, 'user', 4)]);
    await runQueue();
    expect(keysOf('AuthSignIns')).toEqual([`${other.pk}|${other.sk}`]);
  });
});
