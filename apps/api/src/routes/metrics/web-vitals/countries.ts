import { vValidator } from '@hono/valibot-validator';
import {
  MetricsCountriesQuerySchema,
  MetricsCountryParamSchema,
  MetricsCountryQuerySchema,
  type WebVitalAggregate,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';

import type { Variables } from '@/middleware/auth';

import {
  aggregateSummaries,
  buildPk,
  getDateRange,
  queryByPkAndPrefix,
  queryCountryTimeSeries,
} from './queries';

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

  // Fetch country items for each day with device filter in pk
  const allCountryItems: WebVitalAggregate[] = [];
  await Promise.all(
    dates.map(async (date) => {
      const pk = buildPk(date, { device });
      const items = await queryByPkAndPrefix(pk, 'C#');
      allCountryItems.push(...items);
    }),
  );

  // Group by country and aggregate across days
  const countryMap = new Map<string, WebVitalAggregate[]>();
  for (const item of allCountryItems) {
    const country = item.sk.replace('C#', '');
    const existing = countryMap.get(country);
    if (existing) {
      existing.push(item);
    } else {
      countryMap.set(country, [item]);
    }
  }

  // Aggregate each country's data
  const countries: Array<{
    CLS: WebVitalAggregate['CLS'];
    country: string;
    FCP: WebVitalAggregate['FCP'];
    INP: WebVitalAggregate['INP'];
    LCP: WebVitalAggregate['LCP'];
    pageviews: number;
    score: number;
    TTFB: WebVitalAggregate['TTFB'];
  }> = [];

  for (const [country, items] of countryMap) {
    const aggregated = aggregateSummaries(items);
    if (aggregated) {
      countries.push({
        CLS: aggregated.CLS,
        country,
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
  countries.sort((a, b) => {
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

  // Apply limit if provided
  const result = limit ? countries.slice(0, limit) : countries;

  return c.json({
    countries: result,
    endDate,
    startDate,
    total: countries.length,
  });
});

/**
 * GET /metrics/web-vitals/countries/:country
 *
 * Time-series for a specific country.
 * Uses GSI2 (CountryTimeIndex) for efficient queries.
 *
 * Path params:
 * - country: ISO country code (e.g., US, GB, DE)
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 */
app.get(
  '/:country',
  vValidator('param', MetricsCountryParamSchema),
  vValidator('query', MetricsCountryQuerySchema),
  async (c) => {
    const { country } = c.req.valid('param');
    const { days } = c.req.valid('query');
    const numDays = Math.min(Math.max(Number(days) || 7, 1), 30);

    const { endDate, startDate } = getDateRange(numDays);

    // Use GSI for efficient time-series query
    const items = await queryCountryTimeSeries(
      country.toUpperCase(),
      startDate,
      endDate,
    );

    // Sort by date for charting
    items.sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate for period summary
    const aggregated = aggregateSummaries(items);

    return c.json({
      aggregated,
      country: country.toUpperCase(),
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
    });
  },
);

export default app;
