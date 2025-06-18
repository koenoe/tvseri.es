import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { compress } from 'hono/compress';
import { etag } from 'hono/etag';
import { HTTPException } from 'hono/http-exception';

import collection from './routes/collection';
import discover from './routes/discover';
import dominantColor from './routes/dominant-color';
import genres from './routes/genres';
import keyword from './routes/keyword';
import person from './routes/person';
import popular from './routes/popular';
import search from './routes/search';
import series from './routes/series';
import user from './routes/user';

const app = new Hono();

app.use(compress());
app.use(etag());

app.route('/collection', collection);
app.route('/discover', discover);
app.route('/dominant-color', dominantColor);
app.route('/genres', genres);
app.route('/keyword', keyword);
app.route('/person', person);
app.route('/popular', popular);
app.route('/search', search);
app.route('/series', series);
app.route('/user', user);

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json(
      {
        message: error.message || 'HTTP Error',
        status: error.status,
      },
      error.status,
    );
  }

  console.error('Unhandled API error:', error);
  return c.json({ message: 'Internal server error' }, 500);
});

export const handler = handle(app);
