import { Hono } from 'hono';

import { requireAuthAdmin, type Variables } from '@/middleware/auth';
import { cacheHeader } from '@/utils/cacheHeader';

import countries from './countries';
import devices from './devices';
import ingest from './ingest';
import routes from './routes';
import summary from './summary';

// Cache for 24 hours since data is aggregated once per day.
// Browser-only (private): admin data must never be stored at the CDN.
const METRICS_CACHE_HEADER = cacheHeader('metrics', { scope: 'private' });

// The dashboard's reads: admin only
const dashboard = new Hono<{ Variables: Variables }>()
  .use('*', requireAuthAdmin(), async (c, next) => {
    c.header('Cache-Control', METRICS_CACHE_HEADER);
    await next();
  })
  .route('/summary', summary)
  .route('/routes', routes)
  .route('/countries', countries)
  .route('/devices', devices);

const app = new Hono<{ Variables: Variables }>();

// Ingestion from browsers (through the web): no auth
app.route('/', ingest);
app.route('/', dashboard);

export default app;
