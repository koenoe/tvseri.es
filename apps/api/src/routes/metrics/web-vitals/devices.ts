import { vValidator } from '@hono/valibot-validator';
import {
  MetricsDeviceParamSchema,
  MetricsDevicesQuerySchema,
  type MetricsDevicesResponse,
  type MetricsDeviceTimeSeriesResponse,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';

import type { Variables } from '@/middleware/auth';

import { getDateRange } from '../reads';
import {
  aggregateBreakdown,
  aggregateSummaries,
  queryDeviceTimeSeries,
  sortBreakdown,
} from './queries';

const app = new Hono<{ Variables: Variables }>();

/**
 * GET /metrics/web-vitals/devices
 *
 * List all device types with their Web Vitals metrics.
 * Returns mobile, tablet, desktop breakdown.
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - sortBy: pageviews | score | LCP | INP | CLS (default: pageviews)
 * - sortDir: asc | desc (default: desc)
 */
app.get('/', vValidator('query', MetricsDevicesQuerySchema), async (c) => {
  const { days, sortBy = 'pageviews', sortDir = 'desc' } = c.req.valid('query');
  const numDays = Math.min(Math.max(Number(days) || 7, 1), 30);

  const { dates, endDate, startDate } = getDateRange(numDays);

  const devices = sortBreakdown(
    (await aggregateBreakdown(dates, 'D#')).map(([device, metrics]) => ({
      ...metrics,
      device,
    })),
    sortBy,
    sortDir,
  );

  const response: MetricsDevicesResponse = {
    devices,
    endDate,
    startDate,
    total: devices.length,
  };

  return c.json(response);
});

/**
 * GET /metrics/web-vitals/devices/:device
 *
 * Time-series for a specific device type.
 * Uses GSI3 (DeviceTimeIndex) for efficient queries.
 *
 * Path params:
 * - device: mobile | tablet | desktop
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 */
app.get(
  '/:device',
  vValidator('param', MetricsDeviceParamSchema),
  vValidator('query', MetricsDevicesQuerySchema),
  async (c) => {
    const { device } = c.req.valid('param');
    const { days } = c.req.valid('query');
    const numDays = Math.min(Math.max(Number(days) || 7, 1), 30);

    const { endDate, startDate } = getDateRange(numDays);

    // Use GSI for efficient time-series query
    const items = await queryDeviceTimeSeries(device, startDate, endDate);

    // Sort by date for charting
    items.sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate for period summary
    const aggregated = aggregateSummaries(items);

    const response: MetricsDeviceTimeSeriesResponse = {
      aggregated,
      device,
      endDate,
      series: items.map((item) => ({
        CLS: item.CLS,
        date: item.date,
        FCP: item.FCP,
        INP: item.INP,
        LCP: item.LCP,
        pageviews: item.pageviews,
        score: item.score,
        TTFB: item.TTFB,
      })),
      startDate,
    };

    return c.json(response);
  },
);

export default app;
