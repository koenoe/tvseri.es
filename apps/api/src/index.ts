import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { compress } from 'hono/compress';
import { etag } from 'hono/etag';

import collections from './routes/collections';
import genres from './routes/genres';
import series from './routes/series';

const app = new Hono();

app.use(compress());
app.use(etag());
app.route('/collections', collections);
app.route('/genres', genres);
app.route('/series', series);

export const handler = handle(app);
