import { unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  AggregatedApiMetrics,
  Apdex,
  ApiMetricAggregate,
  DependencyOperationStats,
  DependencyStats,
  LatencyRatings,
  PercentileStats,
} from '@tvseri.es/schemas';
import {
  mergeHistogramBins,
  percentileFromLatencyHistogram,
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
 *   buildPk("2025-12-11")                                      → "2025-12-11"
 *   buildPk("2025-12-11", { platform: "ios" })                 → "2025-12-11#P#ios"
 *   buildPk("2025-12-11", { country: "US" })                   → "2025-12-11#C#US"
 *   buildPk("2025-12-11", { platform: "ios", country: "US" })  → "2025-12-11#P#ios#C#US"
 */
export const buildPk = (
  date: string,
  filters?: { country?: string; platform?: string },
): string => {
  let pk = date;
  if (filters?.platform) {
    pk += `#P#${filters.platform}`;
  }
  if (filters?.country) {
    pk += `#C#${filters.country}`;
  }
  return pk;
};

export const queryByPkAndPrefix = (pk: string, skPrefix: string) =>
  queryItemsByPrefix<ApiMetricAggregate>(
    Resource.MetricsApiAggregated.name,
    pk,
    skPrefix,
  );

/**
 * The SUMMARY aggregate of each date (with optional filters), in one
 * BatchGetItem: the keys are exact, so no Query per date is needed. Days
 * without data are absent. Sorted by date.
 */
export const getSummaries = async (
  dates: ReadonlyArray<string>,
  filters?: Readonly<{ country?: string; platform?: string }>,
): Promise<ApiMetricAggregate[]> => {
  const items = await batchGet(
    Resource.MetricsApiAggregated.name,
    dates.map((date) => ({
      pk: { S: buildPk(date, filters) },
      sk: { S: 'SUMMARY' },
    })),
    {},
    metricsDynamo,
  );

  return items
    .map((item) => unmarshall(item) as ApiMetricAggregate)
    .sort((a, b) => a.date.localeCompare(b.date));
};

/** Query endpoint time-series using GSI1 (EndpointTimeIndex). */
export const queryEndpointTimeSeries = (
  endpoint: string,
  startDate: string,
  endDate: string,
) =>
  queryTimeSeries<ApiMetricAggregate>({
    endDate,
    gsi: 'GSI1',
    index: 'EndpointTimeIndex',
    pk: `E#${endpoint}`,
    startDate,
    table: Resource.MetricsApiAggregated.name,
  });

/**
 * Aggregate multiple daily summaries into a single summary.
 * Uses histogram merging for accurate percentile calculation when histograms
 * are available, falling back to weighted averages for legacy data.
 */
export const aggregateSummaries = (
  items: ApiMetricAggregate[],
): AggregatedApiMetrics | null => {
  if (items.length === 0) return null;

  const totalRequests = items.reduce((sum, item) => sum + item.requestCount, 0);
  if (totalRequests === 0) return null;

  const histograms = items
    .map((item) => item.latency.histogram?.bins)
    .filter((bins): bins is number[] => bins !== undefined && bins.length > 0);

  if (histograms.length === 0) return null;

  const mergedBins = mergeHistogramBins(histograms);

  let ratings: LatencyRatings | undefined;
  const itemsWithRatings = items.filter((item) => item.latency.ratings);
  if (itemsWithRatings.length > 0) {
    ratings = { fast: 0, moderate: 0, slow: 0 };
    for (const item of itemsWithRatings) {
      if (item.latency.ratings) {
        ratings.fast += item.latency.ratings.fast;
        ratings.moderate += item.latency.ratings.moderate;
        ratings.slow += item.latency.ratings.slow;
      }
    }
  }

  const latency: PercentileStats = {
    count: totalRequests,
    p75: Math.round(percentileFromLatencyHistogram(mergedBins, 75)),
    p90: Math.round(percentileFromLatencyHistogram(mergedBins, 90)),
    p95: Math.round(percentileFromLatencyHistogram(mergedBins, 95)),
    p99: Math.round(percentileFromLatencyHistogram(mergedBins, 99)),
    ratings,
  };

  const statusCodes: {
    clientError: number;
    codes: Record<string, number>;
    redirect: number;
    serverError: number;
    success: number;
  } = {
    clientError: 0,
    codes: {},
    redirect: 0,
    serverError: 0,
    success: 0,
  };
  for (const item of items) {
    if (item.statusCodes) {
      statusCodes.success += item.statusCodes.success ?? 0;
      statusCodes.redirect += item.statusCodes.redirect ?? 0;
      statusCodes.clientError += item.statusCodes.clientError ?? 0;
      statusCodes.serverError += item.statusCodes.serverError ?? 0;
      if (item.statusCodes.codes) {
        for (const [code, count] of Object.entries(item.statusCodes.codes)) {
          statusCodes.codes[code] = (statusCodes.codes[code] ?? 0) + count;
        }
      }
    }
  }

  const totalErrors = statusCodes.clientError + statusCodes.serverError;
  const errorRate = Math.round((totalErrors / totalRequests) * 10000) / 100;

  // Aggregate Apdex: sum counts across days, recalculate score
  const apdex: Apdex = {
    frustrated: 0,
    satisfied: 0,
    score: 1,
    tolerating: 0,
  };
  for (const item of items) {
    if (item.apdex) {
      apdex.satisfied += item.apdex.satisfied;
      apdex.tolerating += item.apdex.tolerating;
      apdex.frustrated += item.apdex.frustrated;
    }
  }
  const apdexTotal = apdex.satisfied + apdex.tolerating + apdex.frustrated;
  if (apdexTotal > 0) {
    apdex.score =
      Math.round(
        ((apdex.satisfied + apdex.tolerating * 0.5) / apdexTotal) * 100,
      ) / 100;
  }

  let dependencies: Record<string, DependencyStats> | undefined;
  const depsWithData = items.filter((item) => item.dependencies);
  if (depsWithData.length > 0) {
    const depData = new Map<
      string,
      {
        dailyStats: Map<string, { errorCount: number; histogram: number[] }>;
        errorCount: number;
        histograms: number[][];
      }
    >();

    for (const item of depsWithData) {
      if (!item.dependencies) continue;
      for (const [source, stats] of Object.entries(item.dependencies)) {
        const existing = depData.get(source);
        if (existing) {
          if (stats.histogram?.bins) {
            existing.histograms.push(stats.histogram.bins);
            existing.dailyStats.set(item.date, {
              errorCount: stats.errorCount ?? 0,
              histogram: stats.histogram.bins,
            });
          }
          existing.errorCount += stats.errorCount ?? 0;
        } else {
          const dailyStats = new Map<
            string,
            { errorCount: number; histogram: number[] }
          >();
          if (stats.histogram?.bins) {
            dailyStats.set(item.date, {
              errorCount: stats.errorCount ?? 0,
              histogram: stats.histogram.bins,
            });
          }
          depData.set(source, {
            dailyStats,
            errorCount: stats.errorCount ?? 0,
            histograms: stats.histogram?.bins ? [stats.histogram.bins] : [],
          });
        }
      }
    }

    if (depData.size > 0) {
      const depDaysWithData = new Set(depsWithData.map((item) => item.date))
        .size;
      const depMinutesInPeriod = depDaysWithData * 1440;

      dependencies = {};
      for (const [source, { dailyStats, errorCount, histograms }] of depData) {
        if (histograms.length === 0) continue;
        const mergedBins = mergeHistogramBins(histograms);
        const totalCount = histograms.reduce(
          (sum, bins) => sum + bins.reduce((a, b) => a + b, 0),
          0,
        );
        const throughput =
          depMinutesInPeriod > 0
            ? Math.round((totalCount / depMinutesInPeriod) * 100) / 100
            : 0;

        const topOperations = aggregateDependencyTopOperations(items, source);

        const days = [...dailyStats.entries()].sort(([a], [b]) =>
          a.localeCompare(b),
        );
        const toSeries = (
          pick: (day: { errorCount: number; histogram: number[] }) => number,
        ) =>
          days.length > 1
            ? days.map(([timestamp, day]) => ({ timestamp, value: pick(day) }))
            : undefined;
        const dayCount = (bins: number[]) =>
          bins.reduce((sum, bin) => sum + bin, 0);

        dependencies[source] = {
          count: totalCount,
          errorCount,
          errorRate:
            totalCount > 0
              ? Math.round((errorCount / totalCount) * 10000) / 100
              : 0,
          errorRateHistory: toSeries((day) => {
            const count = dayCount(day.histogram);
            return count > 0
              ? Math.round((day.errorCount / count) * 10000) / 100
              : 0;
          }),
          history: toSeries((day) =>
            Math.round(percentileFromLatencyHistogram(day.histogram, 75)),
          ),
          p75: Math.round(percentileFromLatencyHistogram(mergedBins, 75)),
          p90: Math.round(percentileFromLatencyHistogram(mergedBins, 90)),
          p95: Math.round(percentileFromLatencyHistogram(mergedBins, 95)),
          p99: Math.round(percentileFromLatencyHistogram(mergedBins, 99)),
          requestsHistory: toSeries((day) => dayCount(day.histogram)),
          throughput,
          topOperations: topOperations.length > 0 ? topOperations : undefined,
        };
      }
    }
  }

  // Requests per minute, over the days that have data
  const uniqueDates = new Set(items.map((item) => item.date));
  const daysWithData = uniqueDates.size;
  const minutesInPeriod = daysWithData * 1440; // 1440 minutes per day
  const throughput =
    minutesInPeriod > 0
      ? Math.round((totalRequests / minutesInPeriod) * 100) / 100
      : 0;

  return {
    apdex,
    dependencies,
    errorRate,
    latency,
    requestCount: totalRequests,
    statusCodes,
    throughput,
  };
};

const aggregateDependencyTopOperations = (
  items: ApiMetricAggregate[],
  source: string,
  limit = 25,
): DependencyOperationStats[] => {
  const allOps = items.flatMap(
    (item) => item.dependencies?.[source]?.topOperations ?? [],
  );
  if (allOps.length === 0) return [];

  const byOperation = new Map<
    string,
    {
      codes: Map<string, number>;
      errorCount: number;
      histograms: number[][];
      totalCount: number;
    }
  >();

  for (const op of allOps) {
    const existing = byOperation.get(op.operation);
    if (existing) {
      existing.totalCount += op.count;
      existing.errorCount += op.errorCount;
      if (op.histogram?.bins?.length > 0) {
        existing.histograms.push(op.histogram.bins);
      }
      if (op.codes) {
        for (const [code, count] of Object.entries(op.codes)) {
          existing.codes.set(code, (existing.codes.get(code) ?? 0) + count);
        }
      }
    } else {
      const codes = new Map<string, number>();
      if (op.codes) {
        for (const [code, count] of Object.entries(op.codes)) {
          codes.set(code, count);
        }
      }
      byOperation.set(op.operation, {
        codes,
        errorCount: op.errorCount,
        histograms: op.histogram?.bins?.length > 0 ? [op.histogram.bins] : [],
        totalCount: op.count,
      });
    }
  }

  const aggregatedOps: DependencyOperationStats[] = [];

  for (const [
    operation,
    { codes, errorCount, histograms, totalCount },
  ] of byOperation) {
    if (histograms.length === 0) continue;

    const mergedBins = mergeHistogramBins(histograms);
    const errorRate =
      totalCount > 0 ? Math.round((errorCount / totalCount) * 10000) / 100 : 0;

    aggregatedOps.push({
      codes: Object.fromEntries(codes),
      count: totalCount,
      errorCount,
      errorRate,
      histogram: { bins: mergedBins },
      operation,
      p75: Math.round(percentileFromLatencyHistogram(mergedBins, 75)),
      p90: Math.round(percentileFromLatencyHistogram(mergedBins, 90)),
      p95: Math.round(percentileFromLatencyHistogram(mergedBins, 95)),
      p99: Math.round(percentileFromLatencyHistogram(mergedBins, 99)),
    });
  }

  return aggregatedOps.sort((a, b) => b.count - a.count).slice(0, limit);
};

export type DependencyOperationWithSeries = DependencyOperationStats & {
  series: Array<{ date: string; errorRate: number; p75: number }>;
};

export const aggregateDependencyOperationsWithSeries = (
  items: ApiMetricAggregate[],
  source: string,
  limit = 25,
): DependencyOperationWithSeries[] => {
  const byOperation = new Map<
    string,
    {
      codes: Map<string, number>;
      dailyData: Map<string, { errorCount: number; histogram: number[] }>;
      errorCount: number;
      histograms: number[][];
      totalCount: number;
    }
  >();

  for (const item of items) {
    const ops = item.dependencies?.[source]?.topOperations ?? [];
    for (const op of ops) {
      let opData = byOperation.get(op.operation);
      if (!opData) {
        opData = {
          codes: new Map(),
          dailyData: new Map(),
          errorCount: 0,
          histograms: [],
          totalCount: 0,
        };
        byOperation.set(op.operation, opData);
      }

      opData.totalCount += op.count;
      opData.errorCount += op.errorCount;
      if (op.histogram?.bins?.length > 0) {
        opData.histograms.push(op.histogram.bins);
        opData.dailyData.set(item.date, {
          errorCount: op.errorCount,
          histogram: op.histogram.bins,
        });
      }
      if (op.codes) {
        for (const [code, count] of Object.entries(op.codes)) {
          opData.codes.set(code, (opData.codes.get(code) ?? 0) + count);
        }
      }
    }
  }

  const result: DependencyOperationWithSeries[] = [];

  for (const [
    operation,
    { codes, dailyData, errorCount, histograms, totalCount },
  ] of byOperation) {
    if (histograms.length === 0) continue;

    const mergedBins = mergeHistogramBins(histograms);
    const errorRate =
      totalCount > 0 ? Math.round((errorCount / totalCount) * 10000) / 100 : 0;

    const series = [...dailyData.entries()]
      .map(([date, data]) => {
        const dayCount = data.histogram.reduce((a, b) => a + b, 0);
        return {
          date,
          errorRate:
            dayCount > 0
              ? Math.round((data.errorCount / dayCount) * 10000) / 100
              : 0,
          p75: Math.round(percentileFromLatencyHistogram(data.histogram, 75)),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    result.push({
      codes: Object.fromEntries(codes),
      count: totalCount,
      errorCount,
      errorRate,
      histogram: { bins: mergedBins },
      operation,
      p75: Math.round(percentileFromLatencyHistogram(mergedBins, 75)),
      p90: Math.round(percentileFromLatencyHistogram(mergedBins, 90)),
      p95: Math.round(percentileFromLatencyHistogram(mergedBins, 95)),
      p99: Math.round(percentileFromLatencyHistogram(mergedBins, 99)),
      series,
    });
  }

  return result.sort((a, b) => b.count - a.count).slice(0, limit);
};

type ApiSort = 'requests' | 'errorRate' | 'p75' | 'p99' | 'apdex';

type ApiSortable = Readonly<{
  apdex?: Readonly<{ score: number }>;
  errorRate: number;
  latency: Readonly<{ p75: number; p99: number }>;
  requestCount: number;
}>;

const apiSortValue = (row: ApiSortable, sortBy: ApiSort) => {
  switch (sortBy) {
    case 'apdex':
      return row.apdex?.score ?? 0;
    case 'errorRate':
      return row.errorRate;
    case 'p75':
      return row.latency.p75;
    case 'p99':
      return row.latency.p99;
    default:
      return row.requestCount;
  }
};

/** Sorts endpoint, platform or country rows in place by one of their numbers */
export const sortApiRows = <T extends ApiSortable>(
  rows: T[],
  sortBy: ApiSort,
  sortDir: 'asc' | 'desc',
) =>
  rows.sort((a, b) => {
    const aVal = apiSortValue(a, sortBy);
    const bVal = apiSortValue(b, sortBy);
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });
