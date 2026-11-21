import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requestId } from 'hono/request-id';
import { timeout } from 'hono/timeout';

import { setLambdaKind } from './lib/upstream/budget';
import { findUpstreamUnavailable } from './lib/upstream/errors';
import { requireApiKey } from './middleware/apiKey';
import type { Variables } from './middleware/auth';
import { errorCacheControl } from './middleware/cacheControl';
import { retryDeadline } from './middleware/deadline';
import { toHttpException } from './middleware/domainErrors';
import { metrics as metricsMiddleware, redactPath } from './middleware/metrics';
import admin from './routes/admin';
import collection from './routes/collection';
import connections from './routes/connections';
import discover from './routes/discover';
import dominantColor from './routes/dominant-color';
import duration from './routes/duration';
import home from './routes/home';
import me from './routes/me';
import metrics from './routes/metrics';
import network from './routes/network';
import person from './routes/person';
import popular from './routes/popular';
import premieres from './routes/premieres';
import scrobble from './routes/scrobble';
import search from './routes/search';
import series from './routes/series';
import user from './routes/user';
import webhook from './routes/webhook';

// This Lambda answers people: it gets the API's TMDB budget (every other
// Lambda imports no app and keeps the background one)
setLambdaKind('api');

const app = new Hono<{ Variables: Variables }>();

app.use(requestId({ headerName: 'x-amz-cf-id' }));
// Before metrics: requests rejected at the edge were never recorded either
app.use(requireApiKey());
app.use(metricsMiddleware());

// Must wrap timeout() so 504s are covered too
app.use(errorCacheControl());

// Request timeout (Lambda timeout is 15s, use 14s to allow graceful response).
// Reads keep it too: past the web's 10 s nobody waits for the answer, but a
// cold read that finishes still fills the Cache table and the CDN.
app.use(timeout(14_000));

// Reads only retry an external call while the retry can still answer the web
// in time (READ_RETRY_DEADLINE); writes keep their retries.
app.use(retryDeadline());

app.route('/admin', admin);
app.route('/collection', collection);
app.route('/connections', connections);
app.route('/discover', discover);
app.route('/dominant-color', dominantColor);
app.route('/duration', duration);
app.route('/home', home);
app.route('/me', me);
app.route('/metrics', metrics);
app.route('/network', network);
app.route('/person', person);
app.route('/popular', popular);
app.route('/premieres', premieres);
app.route('/scrobble', scrobble);
app.route('/search', search);
app.route('/series', series);
app.route('/webhook', webhook);
app.route('/user', user);

// JSON like every other error. Headers a route set before calling
// c.notFound() (e.g. the public cache profile of cachedNotFound) are kept.
app.notFound((c) => c.json({ message: 'Not Found', status: 404 }, 404));

// AWS SDK errors that mean "try again later" rather than "we have a bug"
const THROTTLING_ERRORS = new Set([
  'ProvisionedThroughputExceededException',
  'RequestLimitExceeded',
  'ThrottlingException',
  'TooManyRequestsException',
]);

// Libraries may wrap AWS SDK errors (e.g. the cache), keeping them as `cause`
const isThrottlingError = (error: Error) =>
  THROTTLING_ERRORS.has(error.name) ||
  (error.cause instanceof Error && THROTTLING_ERRORS.has(error.cause.name));

app.onError((thrown, c) => {
  // The data layer's own errors answer as the HTTPException they stand for
  const error = toHttpException(thrown) ?? thrown;
  const isHttpException = error instanceof HTTPException;

  // Log server errors (incl. 5xx HTTPExceptions such as timeout()'s 504) - no
  // stack traces or sensitive details (webhook tokens are redacted from the path)
  if (!isHttpException || error.status >= 500) {
    console.error(
      JSON.stringify({
        cause: error.cause instanceof Error ? error.cause.name : undefined,
        error: error.name,
        level: 'error',
        message: error.message,
        method: c.req.method,
        path: redactPath(c.req.path),
        requestId: c.get('requestId') ?? 'unknown',
        status: isHttpException ? error.status : undefined,
      }),
    );
  }

  if (isHttpException) {
    return c.json(
      {
        message: error.message || 'HTTP Error',
        status: error.status,
      },
      error.status,
    );
  }

  // Never leak internal (e.g. AWS) error messages to clients
  if (error.name === 'ConditionalCheckFailedException') {
    return c.json({ message: 'Conflict', status: 409 }, 409);
  }

  // A client cursor for another index/sort order (see decodeCursor)
  if (
    error.name === 'ValidationException' &&
    /start(ing)? key/i.test(error.message)
  ) {
    return c.json({ message: 'Invalid cursor', status: 400 }, 400);
  }

  // An upstream we may not ask right now (an open breaker, a 429, no budget
  // slot in time): a 503 that says when to come back. CloudFront keeps it
  // 10 s and the web shows its "unavailable" state for 30 s
  const unavailable = findUpstreamUnavailable(error);
  if (unavailable) {
    c.header('Retry-After', String(unavailable.retryAfterSeconds));
    return c.json(
      { message: 'Service temporarily unavailable', status: 503 },
      503,
    );
  }

  if (isThrottlingError(error)) {
    c.header('Retry-After', '1');
    return c.json(
      { message: 'Service temporarily unavailable', status: 503 },
      503,
    );
  }

  return c.json({ message: 'Internal server error', status: 500 }, 500);
});

export default app;
