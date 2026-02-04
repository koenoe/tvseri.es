import { Hono } from 'hono';

import { requireAuthAdmin, type Variables } from '@/middleware/auth';
import { cacheHeader } from '@/utils/cacheHeader';

import countries from './countries';
import devices from './devices';
import ingest from './ingest';
import routes from './routes';
import summary from './summary';

const app = new Hono<{ Variables: Variables }>();

// Ingestion endpoints (from browser) - no auth required
app.route('/', ingest);

// Dashboard query endpoints - require admin auth
// Cache for 24 hours since data is aggregated once per day
const METRICS_CACHE_HEADER = cacheHeader('metrics');

app.use('/summary/*', requireAuthAdmin());
app.use('/routes/*', requireAuthAdmin());
app.use('/countries/*', requireAuthAdmin());
app.use('/devices/*', requireAuthAdmin());

// // Set cache headers for all dashboard endpoints
app.use('/summary/*', async (c, next) => {
  c.header('Cache-Control', METRICS_CACHE_HEADER);
  await next();
});
app.use('/routes/*', async (c, next) => {
  c.header('Cache-Control', METRICS_CACHE_HEADER);
  await next();
});
app.use('/countries/*', async (c, next) => {
  c.header('Cache-Control', METRICS_CACHE_HEADER);
  await next();
});
app.use('/devices/*', async (c, next) => {
  c.header('Cache-Control', METRICS_CACHE_HEADER);
  await next();
});

app.route('/summary', summary);
app.route('/routes', routes);
app.route('/countries', countries);
app.route('/devices', devices);

export default app;
