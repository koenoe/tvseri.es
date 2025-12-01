import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { compress } from 'hono/compress';
import { etag } from 'hono/etag';
import { HTTPException } from 'hono/http-exception';
import { requestId } from 'hono/request-id';
import { timeout } from 'hono/timeout';

import type { Variables } from './middleware/auth';
import admin from './routes/admin';
import collection from './routes/collection';
import discover from './routes/discover';
import dominantColor from './routes/dominant-color';
import genres from './routes/genres';
import keyword from './routes/keyword';
import me from './routes/me';
import person from './routes/person';
import popular from './routes/popular';
import scrobble from './routes/scrobble';
import search from './routes/search';
import series from './routes/series';
import user from './routes/user';
import webhook from './routes/webhook';

const app = new Hono<{ Variables: Variables }>();

// Observability middleware
app.use(requestId());

// Request timeout (Lambda timeout is 15s, use 14s to allow graceful response)
app.use(timeout(14_000));

app.use(compress());
app.use(etag());

app.route('/admin', admin);
app.route('/collection', collection);
app.route('/discover', discover);
app.route('/dominant-color', dominantColor);
app.route('/genres', genres);
app.route('/keyword', keyword);
app.route('/me', me);
app.route('/person', person);
app.route('/popular', popular);
app.route('/scrobble', scrobble);
app.route('/search', search);
app.route('/series', series);
app.route('/webhook', webhook);
app.route('/user', user);

app.onError((error, c) => {
  const reqId = c.get('requestId') ?? 'unknown';
  const path = c.req.path;
  const method = c.req.method;

  if (error instanceof HTTPException) {
    return c.json(
      {
        message: error.message || 'HTTP Error',
        status: error.status,
      },
      error.status,
    );
  }

  // Log server errors - no stack traces or sensitive details
  console.error(
    JSON.stringify({
      error: error.name,
      level: 'error',
      method,
      path,
      requestId: reqId,
    }),
  );

  return c.json({ message: 'Internal server error' }, 500);
});

export const handler = handle(app);
