import { vValidator } from '@hono/valibot-validator';
import {
  MetricsRoutesQuerySchema,
  type MetricsRoutesResponse,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';

import type { Variables } from '@/middleware/auth';

import { getDateRange } from '../reads';
import { aggregateBreakdown, sortBreakdown } from './queries';

const app = new Hono<{ Variables: Variables }>();

/**
 * GET /metrics/web-vitals/routes
 *
 * List all routes with their Web Vitals metrics.
 * Supports cross-filtering by device and/or country.
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - device: mobile | tablet | desktop (optional filter)
 * - country: US | GB | etc. (optional filter)
 * - sortBy: pageviews | score | LCP | INP | CLS (default: pageviews)
 * - sortDir: asc | desc (default: desc)
 * - limit: number (optional, for top N)
 */
app.get('/', vValidator('query', MetricsRoutesQuerySchema), async (c) => {
  const {
    country,
    days,
    device,
    limit,
    sortBy = 'pageviews',
    sortDir = 'desc',
  } = c.req.valid('query');
  const numDays = Math.min(Math.max(Number(days) || 7, 1), 30);

  const { dates, endDate, startDate } = getDateRange(numDays);

  const routes = sortBreakdown(
    (await aggregateBreakdown(dates, 'R#', { country, device })).map(
      ([route, metrics]) => ({ ...metrics, route }),
    ),
    sortBy,
    sortDir,
  );

  // Apply limit if provided
  const result = limit ? routes.slice(0, limit) : routes;

  const response: MetricsRoutesResponse = {
    endDate,
    routes: result,
    startDate,
    total: routes.length,
  };

  return c.json(response);
});

export default app;
