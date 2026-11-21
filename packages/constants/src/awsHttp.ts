/**
 * `requestHandler` options for every AWS SDK client. Without them a call that
 * hangs (a lost connection, a stalled service) waits out the Lambda's
 * timeout; with them it fails as a TimeoutError, which the SDK's retries
 * treat as transient, so a fresh attempt usually lands.
 *
 * `requestTimeout` runs until the response headers arrive (the body is not
 * on the clock), so a big Query or Scan page doesn't count against it.
 * 3 s (connecting included) is far past a healthy DynamoDB, SQS or KMS call
 * and keeps the default three attempts inside the API's 14 s request
 * timeout. 0 leaves only the connection timeout, for calls whose healthy
 * latency the caller can't bound.
 */
export const awsHttpOptions = (requestTimeout = 3_000) =>
  ({
    connectionTimeout: 1_000,
    requestTimeout,
    // Without it the SDK only logs a warning when requestTimeout passes
    throwOnRequestTimeout: true,
  }) as const;
