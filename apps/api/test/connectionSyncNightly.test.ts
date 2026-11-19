import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { SQSClient } from '@aws-sdk/client-sqs';
import { sleep } from '@tvseri.es/utils';
import { describe, expect, it, vi } from 'vitest';

import { handler } from '@/lambdas/connectionSyncNightly';
import type { ConnectionSyncMessage } from '@/lib/connections/request';
import { getConnection, saveConnection } from '@/lib/db/connections';
import { claimSync } from '@/lib/db/connections/sync';

import { db, sqsMessages } from './db';

const QUEUE = 'https://sqs.test/connection-sync';

const link = (
  userId: string,
  status: 'ok' | 'signed-out' = 'ok',
  lastSyncedAt: number | null = 1,
) =>
  saveConnection({
    createdAt: 1,
    lastSyncedAt,
    latestEpisodeTitle: null,
    latestTitle: null,
    latestWatchedAt: null,
    profileId: 'profile',
    profileName: null,
    secret: 'v1.sealed',
    service: 'netflix',
    status,
    total: null,
    userAgent: null,
    userId,
    via: 'extension',
  });

const queued = () =>
  sqsMessages
    .filter((message) => message.queueUrl === QUEUE)
    .map((message) => (message.body as ConnectionSyncMessage).userId)
    .sort();

describe('the nightly connection sync', () => {
  it('queues every linked connection but a signed-out one', async () => {
    await link('USER_A');
    await link('USER_B');
    await link('USER_C', 'signed-out');
    // Not a connection: the scan skips other items
    db.seed('Connections', [{ pk: 'CODE#1234', sk: 'CODE', userId: 'USER_A' }]);

    expect(await handler()).toEqual({
      busy: 0,
      failed: 0,
      queued: 2,
      signedOut: 1,
      waiting: 0,
    });
    expect(queued()).toEqual(['USER_A', 'USER_B']);
    // Each waits its own part of the 15 minutes
    for (const message of sqsMessages.filter((m) => m.queueUrl === QUEUE)) {
      expect(message.delaySeconds).toBeGreaterThanOrEqual(0);
      expect(message.delaySeconds).toBeLessThan(900);
    }
  });

  it('never starts a first sync: the viewer chooses when, and how far back', async () => {
    await link('USER_A');
    await link('USER_NEW', 'ok', null);
    expect(await handler()).toMatchObject({ queued: 1, waiting: 1 });
    expect(queued()).toEqual(['USER_A']);
  });

  it('carries on a first sync the viewer started', async () => {
    await link('USER_NEW', 'ok', null);
    const connection = await getConnection('USER_NEW', 'netflix');
    if (!connection) {
      throw new Error('not linked');
    }
    await claimSync('USER_NEW', 'netflix', connection);
    sqsMessages.length = 0;
    // The run went quiet: the nightly may take it over
    vi.setSystemTime(Date.now() + 60 * 60 * 1000);
    expect(await handler()).toMatchObject({ queued: 1, waiting: 0 });
    vi.useRealTimers();
  });

  it('leaves a run that is already going alone', async () => {
    await link('USER_A');
    await handler();
    expect(await handler()).toMatchObject({ busy: 1, queued: 0 });
    expect(queued()).toEqual(['USER_A']);
  });

  it('claims from the scan, without reading each connection again', async () => {
    await link('USER_A');
    await link('USER_B');
    db.calls.length = 0;
    await handler();
    expect(db.calls.some((call) => call instanceof GetItemCommand)).toBe(false);
    expect(queued()).toEqual(['USER_A', 'USER_B']);
  });

  it('queues up to ten at once', async () => {
    const users = Array.from({ length: 25 }, (_, n) => `USER_${n}`);
    for (const user of users) {
      await link(user);
    }
    const send = vi.mocked(SQSClient.prototype.send);
    const original = send.getMockImplementation()!;
    let active = 0;
    let most = 0;
    send.mockImplementation((async (...args: Parameters<typeof original>) => {
      active += 1;
      most = Math.max(most, active);
      await sleep(5);
      active -= 1;
      return original(...args);
    }) as typeof original);
    try {
      expect(await handler()).toMatchObject({ queued: 25 });
    } finally {
      send.mockImplementation(original);
    }
    expect(most).toBeGreaterThan(1);
    expect(most).toBeLessThanOrEqual(10);
  });
});

describe('a claim from a snapshot', () => {
  it('claims nothing once the stored run moved on since the snapshot', async () => {
    await link('USER_A');
    const snapshot = await getConnection('USER_A', 'netflix');
    // Sync now got there first
    expect(await claimSync('USER_A', 'netflix', snapshot!)).not.toBeNull();
    const key = { pk: 'USER#USER_A', sk: 'SERVICE#netflix' };
    const item = db.table('Connections').get(key)!;
    const ran = { ...(item.sync as object), state: 'failed' };
    db.table('Connections').put({ ...item, sync: ran });
    // The snapshot had no run: it must not start over the newer one
    expect(await claimSync('USER_A', 'netflix', snapshot!)).toBeNull();
    expect(db.table('Connections').get(key)?.sync).toEqual(ran);
  });
});
