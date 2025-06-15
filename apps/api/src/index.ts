import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { compress } from 'hono/compress';
import { etag } from 'hono/etag';

import collection from './routes/collection';
import discover from './routes/discover';
import genres from './routes/genres';
import keyword from './routes/keyword';
import person from './routes/person';
import search from './routes/search';
import series from './routes/series';

const app = new Hono();

app.use(compress());
app.use(etag());

app.route('/collection', collection);
app.route('/discover', discover);
app.route('/genres', genres);
app.route('/keyword', keyword);
app.route('/person', person);
app.route('/search', search);
app.route('/series', series);

export const handler = handle(app);
