import { Hono } from 'hono';

import type { Variables } from '@/middleware/auth';

import api from './api';
import webVitals from './web-vitals';

const app = new Hono<{ Variables: Variables }>();

// Web Vitals metrics (Core Web Vitals from browser)
app.route('/web-vitals', webVitals);

// API metrics (server-side performance)
app.route('/api', api);

export default app;
