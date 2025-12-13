import { vValidator } from '@hono/valibot-validator';
import {
  MetricsDeviceParamSchema,
  MetricsDevicesQuerySchema,
  type MetricsDevicesResponse,
  type MetricsDeviceTimeSeriesResponse,
  type WebVitalAggregate,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';

import type { Variables } from '@/middleware/auth';

import {
  aggregateSummaries,
  buildPk,
  getDateRange,
  queryByPkAndPrefix,
  queryDeviceTimeSeries,
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

  // Fetch device items for each day (no filters - base pk only)
  const allDeviceItems: WebVitalAggregate[] = [];
  await Promise.all(
    dates.map(async (date) => {
      const pk = buildPk(date);
      const items = await queryByPkAndPrefix(pk, 'D#');
      allDeviceItems.push(...items);
    }),
  );

  // Group by device type and aggregate across days
  const deviceMap = new Map<string, WebVitalAggregate[]>();
  for (const item of allDeviceItems) {
    const device = item.sk.replace('D#', '');
    const existing = deviceMap.get(device);
    if (existing) {
      existing.push(item);
    } else {
      deviceMap.set(device, [item]);
    }
  }

  // Aggregate each device's data
  const devices: Array<{
    CLS: WebVitalAggregate['CLS'];
    device: string;
    FCP: WebVitalAggregate['FCP'];
    INP: WebVitalAggregate['INP'];
    LCP: WebVitalAggregate['LCP'];
    pageviews: number;
    score: number;
    TTFB: WebVitalAggregate['TTFB'];
  }> = [];

  for (const [device, items] of deviceMap) {
    const aggregated = aggregateSummaries(items);
    if (aggregated) {
      devices.push({
        CLS: aggregated.CLS,
        device,
        FCP: aggregated.FCP,
        INP: aggregated.INP,
        LCP: aggregated.LCP,
        pageviews: aggregated.pageviews,
        score: aggregated.score,
        TTFB: aggregated.TTFB,
      });
    }
  }

  // Sort
  devices.sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sortBy) {
      case 'score':
        aVal = a.score;
        bVal = b.score;
        break;
      case 'LCP':
        aVal = a.LCP.p75;
        bVal = b.LCP.p75;
        break;
      case 'INP':
        aVal = a.INP.p75;
        bVal = b.INP.p75;
        break;
      case 'CLS':
        aVal = a.CLS.p75;
        bVal = b.CLS.p75;
        break;
      default:
        aVal = a.pageviews;
        bVal = b.pageviews;
    }

    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

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
