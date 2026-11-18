import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { SQSClient } from '@aws-sdk/client-sqs';
import { afterEach, beforeEach, vi } from 'vitest';

import { resetBreakers } from '@/lib/upstream/breaker';
import { overrideBudget, resetBudgets } from '@/lib/upstream/budget';

import { db, sqsMessages } from './db';
import { fakeFetch, resetHttp } from './fakeHttp';

vi.mock('@/lib/db/client', async () => ({
  default: (await import('./db')).db,
}));

// OpenAuth's token check is the auth issuer boundary: a test token is
// `test-token:<userId>` (role `user`) or `test-token:<userId>:admin`
vi.mock('@openauthjs/openauth/client', () => ({
  createClient: () => ({
    verify: async (_subjects: unknown, token: string) => {
      const [prefix, id, role = 'user'] = token.split(':');
      if (prefix !== 'test-token' || !id) {
        return { err: new Error('invalid token') };
      }
      return { subject: { properties: { id, role }, type: 'user' } };
    },
  }),
}));

type SqsInput = Readonly<{
  QueueUrl?: string;
  MessageBody?: string;
  DelaySeconds?: number;
  Entries?: ReadonlyArray<Readonly<{ MessageBody?: string }>>;
}>;

vi.spyOn(SQSClient.prototype, 'send').mockImplementation((async (
  command: Readonly<{ input: SqsInput }>,
) => {
  const { DelaySeconds, Entries, MessageBody, QueueUrl } = command.input;
  for (const entry of Entries ?? [{ MessageBody }]) {
    sqsMessages.push({
      body: JSON.parse(entry.MessageBody ?? 'null'),
      queueUrl: String(QueueUrl),
      ...(DelaySeconds !== undefined && { delaySeconds: DelaySeconds }),
    });
  }
  return { Failed: [], Successful: [] };
}) as never);

vi.stubGlobal('fetch', fakeFetch);

beforeEach(() => {
  // Every test starts with closed breakers and an idle budget without a
  // rate cap (tests run TMDB fan-outs in real time; budget.test.ts and the
  // load rig check the cap)
  resetBreakers();
  resetBudgets();
  overrideBudget({ perSecond: Number.POSITIVE_INFINITY });
  db.reset();
  resetHttp();
  // The image Lambda (colours, logo checks) is not there in tests: a call
  // fails, as an unreachable Lambda does; a test that needs an answer mocks it
  vi.spyOn(LambdaClient.prototype, 'send').mockRejectedValue(
    new Error('No Lambda in tests'),
  );
  // No CDN in tests: a purge is accepted; a test that checks it spies again
  vi.spyOn(CloudFrontClient.prototype, 'send').mockResolvedValue({
    Invalidation: { Id: 'test' },
  } as never);
  sqsMessages.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});
