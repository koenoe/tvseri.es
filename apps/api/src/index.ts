import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { compress } from 'hono/compress';
import { etag } from 'hono/etag';

import collections from './routes/collections';
import series from './routes/series';

const app = new Hono();

app.use(compress());
app.use(etag());
app.route('/series', series);
app.route('/collections', collections);

export const handler = handle(app);
