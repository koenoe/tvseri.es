import { vValidator } from '@hono/valibot-validator';
import {
  MetricsCountriesQuerySchema,
  type MetricsCountriesResponse,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';

import type { Variables } from '@/middleware/auth';

import { getDateRange } from '../reads';
import { aggregateBreakdown, sortBreakdown } from './queries';

const app = new Hono<{ Variables: Variables }>();

/**
 * GET /metrics/web-vitals/countries
 *
 * List all countries with their Web Vitals metrics.
 * Supports filtering by device type.
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - device: mobile | tablet | desktop (optional filter)
 * - sortBy: pageviews | score | LCP | INP | CLS (default: pageviews)
 * - sortDir: asc | desc (default: desc)
 * - limit: number (optional, for top N)
 */
app.get('/', vValidator('query', MetricsCountriesQuerySchema), async (c) => {
  const {
    days,
    device,
    limit,
    sortBy = 'pageviews',
    sortDir = 'desc',
  } = c.req.valid('query');
  const numDays = Math.min(Math.max(Number(days) || 7, 1), 30);

  const { dates, endDate, startDate } = getDateRange(numDays);

  const countries = sortBreakdown(
    (await aggregateBreakdown(dates, 'C#', { device })).map(
      ([country, metrics]) => ({ ...metrics, country }),
    ),
    sortBy,
    sortDir,
  );

  // Apply limit if provided
  const result = limit ? countries.slice(0, limit) : countries;

  const response: MetricsCountriesResponse = {
    countries: result,
    endDate,
    startDate,
    total: countries.length,
  };

  return c.json(response);
});

export default app;
