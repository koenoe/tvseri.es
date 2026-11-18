import type { Context } from 'aws-lambda';

/** A Lambda context with `remainingMs` left before the timeout */
export const lambdaContext = (remainingMs = 300_000) =>
  ({ getRemainingTimeInMillis: () => remainingMs }) as unknown as Context;
