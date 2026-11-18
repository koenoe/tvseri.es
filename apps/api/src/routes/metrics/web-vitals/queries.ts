import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { WebVitalAggregate } from '@tvseri.es/schemas';
import {
  computeRESFromStats,
  mergeHistograms,
  percentileFromHistogram,
} from '@tvseri.es/utils';
import { Resource } from 'sst';

import { batchGet } from '@/lib/db/batch';

import {
  metricsDynamo,
  queryByPkAndPrefix as queryItemsByPrefix,
  queryTimeSeries,
} from '../reads';

/**
 * Build the pk for a given date and optional filters.
 *
 * Examples:
 *   buildPk("2025-12-11")                           → "2025-12-11"
 *   buildPk("2025-12-11", { device: "mobile" })     → "2025-12-11#D#mobile"
 *   buildPk("2025-12-11", { country: "US" })        → "2025-12-11#C#US"
 *   buildPk("2025-12-11", { device: "mobile", country: "US" }) → "2025-12-11#D#mobile#C#US"
 */
export const buildPk = (
  date: string,
  filters?: { country?: string; device?: string },
): string => {
  let pk = date;
  if (filters?.device) {
    pk += `#D#${filters.device}`;
  }
  if (filters?.country) {
    pk += `#C#${filters.country}`;
  }
  return pk;
};

/**
 * Query by pk and sk prefix.
 *
 * @param pk - The partition key (date with optional filters)
 * @param skPrefix - The sort key prefix (SUMMARY, R#, C#, D#)
 */
const queryByPkAndPrefix = (pk: string, skPrefix: string) =>
  queryItemsByPrefix<WebVitalAggregate>(
    Resource.MetricsWebVitalsAggregated.name,
    pk,
    skPrefix,
  );

/**
 * Several exact pk + sk reads in one BatchGetItem (instead of a Query each).
 * Missing items are absent; the order is not guaranteed.
 */
export const getExact = async (
  keys: ReadonlyArray<Readonly<{ pk: string; sk: string }>>,
): Promise<WebVitalAggregate[]> => {
  const items = await batchGet(
    Resource.MetricsWebVitalsAggregated.name,
    keys.map(({ pk, sk }) => ({ pk: { S: pk }, sk: { S: sk } })),
    {},
    metricsDynamo,
  );

  return items.map((item) => unmarshall(item) as WebVitalAggregate);
};

/**
 * Query route time-series using GSI1 (RouteTimeIndex).
 * Returns daily aggregates for a specific route over a date range.
 */
export const queryRouteTimeSeries = (
  route: string,
  startDate: string,
  endDate: string,
) =>
  queryTimeSeries<WebVitalAggregate>({
    endDate,
    gsi: 'GSI1',
    index: 'RouteTimeIndex',
    pk: `R#${route}`,
    startDate,
    table: Resource.MetricsWebVitalsAggregated.name,
  });

/**
 * Aggregate multiple daily summaries into a single summary.
 * Merges histograms to compute accurate percentiles.
 * Falls back to weighted averages for data without histograms.
 *
 * RES is recalculated from the merged p75 values using Vercel's methodology
 * (log-normal scoring with LCP 30%, INP 30%, CLS 25%, FCP 15%).
 */
export const aggregateSummaries = (
  items: WebVitalAggregate[],
): {
  CLS: WebVitalAggregate['CLS'];
  FCP: WebVitalAggregate['FCP'];
  INP: WebVitalAggregate['INP'];
  LCP: WebVitalAggregate['LCP'];
  pageviews: number;
  score: number;
  TTFB: WebVitalAggregate['TTFB'];
} | null => {
  if (items.length === 0) return null;

  const totalPageviews = items.reduce((sum, item) => sum + item.pageviews, 0);

  const aggregateMetric = (
    metricName: 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB',
  ): WebVitalAggregate['CLS'] => {
    const totalCount = items.reduce(
      (sum, item) => sum + item[metricName].count,
      0,
    );

    if (totalCount === 0) {
      return {
        count: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        ratings: { good: 0, needsImprovement: 0, poor: 0 },
      };
    }

    // Sum ratings (always accurate)
    const ratings = {
      good: items.reduce((sum, item) => sum + item[metricName].ratings.good, 0),
      needsImprovement: items.reduce(
        (sum, item) => sum + item[metricName].ratings.needsImprovement,
        0,
      ),
      poor: items.reduce((sum, item) => sum + item[metricName].ratings.poor, 0),
    };

    // Collect histograms from items that have them
    const histograms = items
      .map((item) => item[metricName].histogram?.bins)
      .filter(
        (bins): bins is number[] => bins !== undefined && bins.length > 0,
      );

    // Only use histograms if ALL items have them (avoid mixing histogram-based
    // percentiles with a count that includes non-histogram items)
    if (histograms.length === items.length && histograms.length > 0) {
      const mergedBins = mergeHistograms(histograms);

      return {
        count: totalCount,
        p75: percentileFromHistogram(mergedBins, metricName, 75),
        p90: percentileFromHistogram(mergedBins, metricName, 90),
        p95: percentileFromHistogram(mergedBins, metricName, 95),
        p99: percentileFromHistogram(mergedBins, metricName, 99),
        ratings,
      };
    }

    // Fallback: weighted averages for legacy data without histograms
    const weightedP75 =
      items.reduce(
        (sum, item) => sum + item[metricName].p75 * item[metricName].count,
        0,
      ) / totalCount;
    const weightedP90 =
      items.reduce(
        (sum, item) => sum + item[metricName].p90 * item[metricName].count,
        0,
      ) / totalCount;
    const weightedP95 =
      items.reduce(
        (sum, item) => sum + item[metricName].p95 * item[metricName].count,
        0,
      ) / totalCount;
    const weightedP99 =
      items.reduce(
        (sum, item) => sum + item[metricName].p99 * item[metricName].count,
        0,
      ) / totalCount;

    return {
      count: totalCount,
      p75: weightedP75,
      p90: weightedP90,
      p95: weightedP95,
      p99: weightedP99,
      ratings,
    };
  };

  // Aggregate each metric
  const CLS = aggregateMetric('CLS');
  const FCP = aggregateMetric('FCP');
  const INP = aggregateMetric('INP');
  const LCP = aggregateMetric('LCP');
  const TTFB = aggregateMetric('TTFB');

  // Recalculate RES from the merged p75 values using Vercel's methodology:
  // - Uses Lighthouse 10 log-normal scoring curves
  // - Weighted: LCP 30%, INP 30%, CLS 25%, FCP 15%
  // - TTFB is intentionally excluded from RES
  const score = computeRESFromStats({ CLS, FCP, INP, LCP });

  return {
    CLS,
    FCP,
    INP,
    LCP,
    pageviews: totalPageviews,
    score,
    TTFB,
  };
};

/** A breakdown row's metrics (a route, country or device), across the days */
type BreakdownMetrics = NonNullable<ReturnType<typeof aggregateSummaries>>;

/**
 * Every breakdown of a kind (`R#` routes, `C#` countries, `D#` devices) under
 * the filters, each aggregated across the dates: one Query per date, in
 * parallel. Keyed by the sort key without its prefix.
 */
export const aggregateBreakdown = async (
  dates: ReadonlyArray<string>,
  prefix: 'R#' | 'C#' | 'D#',
  filters?: Readonly<{ country?: string; device?: string }>,
): Promise<Array<[string, BreakdownMetrics]>> => {
  const perDay = await Promise.all(
    dates.map((date) => queryByPkAndPrefix(buildPk(date, filters), prefix)),
  );

  const byKey = new Map<string, WebVitalAggregate[]>();
  for (const item of perDay.flat()) {
    const key = item.sk.replace(prefix, '');
    const existing = byKey.get(key);
    if (existing) {
      existing.push(item);
    } else {
      byKey.set(key, [item]);
    }
  }

  return [...byKey].flatMap(
    ([key, items]): Array<[string, BreakdownMetrics]> => {
      const aggregated = aggregateSummaries(items);
      return aggregated ? [[key, aggregated]] : [];
    },
  );
};

type WebVitalsSort = 'pageviews' | 'score' | 'LCP' | 'INP' | 'CLS';

const sortValue = (
  row: Pick<BreakdownMetrics, 'CLS' | 'INP' | 'LCP' | 'pageviews' | 'score'>,
  sortBy: WebVitalsSort,
) => {
  switch (sortBy) {
    case 'score':
      return row.score;
    case 'LCP':
    case 'INP':
    case 'CLS':
      return row[sortBy].p75;
    default:
      return row.pageviews;
  }
};

/** Sorts breakdown rows in place by a metric (the p75 of a vital) */
export const sortBreakdown = <
  T extends Pick<
    BreakdownMetrics,
    'CLS' | 'INP' | 'LCP' | 'pageviews' | 'score'
  >,
>(
  rows: T[],
  sortBy: WebVitalsSort,
  sortDir: 'asc' | 'desc',
) =>
  rows.sort((a, b) => {
    const aVal = sortValue(a, sortBy);
    const bVal = sortValue(b, sortBy);
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });
