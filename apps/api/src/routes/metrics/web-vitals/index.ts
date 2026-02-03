import { Hono } from 'hono';
import { requireAuthAdmin, type Variables } from '@/middleware/auth';
import { cache } from '@/middleware/cache';

import countries from './countries';
import devices from './devices';
import ingest from './ingest';
import routes from './routes';
import summary from './summary';

const app = new Hono<{ Variables: Variables }>();

// Ingestion endpoints (from browser) - no auth required
app.route('/', ingest);

// Dashboard query endpoints - require admin auth with 24h cache
app.use('/summary/*', requireAuthAdmin(), cache('admin'));
app.use('/routes/*', requireAuthAdmin(), cache('admin'));
app.use('/countries/*', requireAuthAdmin(), cache('admin'));
app.use('/devices/*', requireAuthAdmin(), cache('admin'));

app.route('/summary', summary);
app.route('/routes', routes);
app.route('/countries', countries);
app.route('/devices', devices);

export default app;
