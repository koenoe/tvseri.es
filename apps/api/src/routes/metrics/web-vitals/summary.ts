import { vValidator } from '@hono/valibot-validator';
import {
  MetricsSummaryQuerySchema,
  type MetricsSummaryResponse,
  type WebVitalAggregate,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';

import type { Variables } from '@/middleware/auth';

import {
  aggregateSummaries,
  buildPk,
  getDateRange,
  queryExact,
} from './queries';

const app = new Hono<{ Variables: Variables }>();

/**
 * GET /metrics/web-vitals/summary
 *
 * Main dashboard endpoint. Returns:
 * - Overall score and pageviews for the period
 * - All 5 Web Vitals with p75/p90/p95/p99 + ratings
 * - Daily time-series for charting
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - device: mobile | tablet | desktop (optional filter)
 * - country: US | GB | etc. (optional filter)
 */
app.get('/', vValidator('query', MetricsSummaryQuerySchema), async (c) => {
  const { country, days, device } = c.req.valid('query');
  const numDays = Math.min(Math.max(Number(days) || 7, 1), 30);

  const { dates, endDate, startDate } = getDateRange(numDays);

  // Fetch SUMMARY items for each day with filters
  // Data is stored with combined dimension keys: <date>#D#<device>#C#<country>
  const summaries: WebVitalAggregate[] = [];
  await Promise.all(
    dates.map(async (date) => {
      const pk = buildPk(date, { country, device });
      const item = await queryExact(pk, 'SUMMARY');
      if (item) summaries.push(item);
    }),
  );

  // Sort by date ascending for chart
  summaries.sort((a, b) => a.date.localeCompare(b.date));

  // Aggregate all summaries into period totals
  const aggregated = aggregateSummaries(summaries);

  const response: MetricsSummaryResponse = {
    aggregated,
    endDate,
    series: summaries.map((s) => ({
      CLS: s.CLS,
      date: s.date,
      FCP: s.FCP,
      INP: s.INP,
      LCP: s.LCP,
      pageviews: s.pageviews,
      score: s.score,
      TTFB: s.TTFB,
    })),
    startDate,
  };

  return c.json(response);
});

export default app;
