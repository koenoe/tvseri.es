import { Hono } from 'hono';

import { requireAuthAdmin, type Variables } from '@/middleware/auth';

import countries from './countries';
import devices from './devices';
import ingest from './ingest';
import routes from './routes';
import summary from './summary';

const app = new Hono<{ Variables: Variables }>();

// Ingestion endpoints (from browser) - no auth required
app.route('/', ingest);

// Dashboard query endpoints - require admin auth
app.use('/summary/*', requireAuthAdmin());
app.use('/routes/*', requireAuthAdmin());
app.use('/countries/*', requireAuthAdmin());
app.use('/devices/*', requireAuthAdmin());

app.route('/summary', summary);
app.route('/routes', routes);
app.route('/countries', countries);
app.route('/devices', devices);

export default app;
