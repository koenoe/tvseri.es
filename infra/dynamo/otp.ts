/// <reference path="../../.sst/platform/config.d.ts" />

import { email } from '../email';

export const otp = new sst.aws.Dynamo('OTP', {
  fields: {
    pk: 'string', // EMAIL#<email>
    sk: 'string', // CODE#<code>

    // email: 'string',
    // createdAt: 'string',
    // expiresAt: 'number',
  },
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk',
  },
  stream: 'new-image',
  ttl: 'expiresAt',
});

otp.subscribe(
  'OTPSubscriber',
  {
    architecture: 'arm64',
    concurrency: {
      reserved: 100,
    },
    handler: 'apps/api/src/lambdas/otp.handler',
    link: [email],
    nodejs: {
      esbuild: {
        external: [
          '@aws-sdk/client-cloudfront',
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/client-lambda',
          '@aws-sdk/client-sesv2',
          '@aws-sdk/client-sqs',
          '@aws-sdk/util-dynamodb',
        ],
      },
      minify: true,
    },
    runtime: 'nodejs22.x',
    timeout: '30 seconds',
  },
  {
    transform: {
      eventSourceMapping: {
        batchSize: 25,
        maximumBatchingWindowInSeconds: 2,
        maximumRetryAttempts: 10,
      },
    },
  },
);
