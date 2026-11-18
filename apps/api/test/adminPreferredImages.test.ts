import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

/**
 * An admin save stores the pick, starts a CloudFront purge of the paths that
 * show it and answers at once, without waiting for the purge. A purge
 * CloudFront refuses is logged and doesn't fail the save.
 */

const PICK = {
  backdropColor: '#112233',
  backdropImagePath: '/top.jpg',
};

let created: ReadonlyArray<string>;
let createFails: boolean;
let sent: Array<unknown>;

beforeEach(() => {
  created = [];
  createFails = false;
  sent = [];
  seedUser({ role: 'admin' });
  vi.spyOn(CloudFrontClient.prototype, 'send').mockImplementation((async (
    command: unknown,
  ) => {
    sent.push(command);
    if (command instanceof CreateInvalidationCommand) {
      if (createFails) {
        throw new Error('AccessDenied');
      }
      created = command.input.InvalidationBatch?.Paths?.Items ?? [];
      return { Invalidation: { Id: 'I2ABC', Status: 'InProgress' } };
    }
    throw new Error('unexpected command');
  }) as never);
});

const save = (method: 'PUT' | 'DELETE') =>
  request('/admin/preferred-images/series/5', {
    admin: true,
    as: USER_ID,
    body: method === 'PUT' ? PICK : undefined,
    method,
  });

describe.each(['PUT', 'DELETE'] as const)('%s preferred images', (method) => {
  it('purges the show, trending and the Duration answers and answers without waiting for it', async () => {
    const response = await save(method);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'OK' });
    expect(created).toEqual([
      '/series/5*',
      '/collection/trending*',
      '/duration*',
    ]);
    // Only the purge itself: no check of its progress
    expect(sent).toHaveLength(1);
  });

  it('still saves when CloudFront refuses the purge', async () => {
    createFails = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await save(method);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'OK' });
  });
});

it('stores the pick before answering', async () => {
  await save('PUT');
  expect(db.dump('PreferredImages')[0]).toMatchObject(PICK);
});
