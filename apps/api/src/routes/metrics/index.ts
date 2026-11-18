import { Hono } from 'hono';

import type { Variables } from '@/middleware/auth';

import api from './api';
import webVitals from './web-vitals';

const app = new Hono<{ Variables: Variables }>();

app.route('/web-vitals', webVitals);

app.route('/api', api);

export default app;
