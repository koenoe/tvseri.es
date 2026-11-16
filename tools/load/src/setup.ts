import { LambdaClient } from '@aws-sdk/client-lambda';
import { SQSClient } from '@aws-sdk/client-sqs';
import { vi } from 'vitest';

import { db } from '../../../apps/api/test/db';
import type { FakeDynamo } from '../../../apps/api/test/fakeDynamo';
import { fakeFetch } from '../../../apps/api/test/fakeHttp';

/**
 * The rig's boundaries, the same as the API tests' (test/setup.ts) with one
 * difference: the in-memory DynamoDB (the tests' `db`, so their seed helpers
 * work) is kept on globalThis, so every simulated Lambda instance (a fresh
 * module graph, see fleet.ts) shares one table set, as real instances share
 * DynamoDB.
 */
type Shared = { __loadDb?: FakeDynamo };
const shared = globalThis as Shared;
shared.__loadDb ??= db;

vi.mock('@/lib/db/client', () => ({
  default: (globalThis as Shared).__loadDb,
}));

vi.mock('@openauthjs/openauth/client', () => ({
  createClient: () => ({
    verify: async (_subjects: unknown, token: string) => {
      const [prefix, id] = token.split(':');
      if (prefix !== 'test-token' || !id) {
        return { err: new Error('invalid token') };
      }
      return { subject: { properties: { id, role: 'user' }, type: 'user' } };
    },
  }),
}));

vi.spyOn(SQSClient.prototype, 'send').mockImplementation((async () => ({
  Failed: [],
  Successful: [],
})) as never);

// The DominantColor Lambda: a colour at once
vi.spyOn(LambdaClient.prototype, 'send').mockImplementation((async () => ({
  Payload: new TextEncoder().encode(JSON.stringify({ color: '#334455' })),
})) as never);

vi.stubGlobal('fetch', fakeFetch);
