import { WEB_VITALS_SAMPLE_RATE } from '@tvseri.es/constants';
import type {
  WebVitalAggregate,
  WebVitalMetricStats,
  WebVitalName,
  WebVitalRatings,
  WebVitalRecord,
  WebVitalTopItem,
} from '@tvseri.es/schemas';
import { buildHistogramBins, computeRESFromStats } from '@tvseri.es/utils';
import { Resource } from 'sst';
import {
  dailyAggregationHandler,
  sampleMultiplier,
} from '@/lib/metrics/dailyAggregation';

/**
 * Web Vitals are sampled per page load (see WEB_VITALS_SAMPLE_RATE), so counts
 * (pageviews, per-metric counts, ratings, histogram bins) are extrapolated.
 * Percentiles and the score are ratios and stay as measured.
 */
const SAMPLE_RATE_MULTIPLIER = sampleMultiplier(WEB_VITALS_SAMPLE_RATE);
const AGGREGATE_TTL_DAYS = 30;

/**
 * Aggregate Web Vital metrics into MetricsWebVitals table.
 *
 * KEY DESIGN: Filters in pk, dimension in sk
 *
 * pk patterns:
 *   "<date>"                         → No filters
 *   "<date>#D#<device>"              → Device filter
 *   "<date>#C#<country>"             → Country filter
 *   "<date>#D#<device>#C#<country>"  → Device + Country filter
 *
 * sk patterns:
 *   "SUMMARY"        → Totals for this filter combo
 *   "R#<route>"      → Route metrics
 *   "C#<country>"    → Country metrics (when pk has no country filter)
 *   "D#<device>"     → Device metrics (when pk has no device filter)
 */
const aggregateWebVitals = (
  records: WebVitalRecord[],
  date: string,
): WebVitalAggregate[] => {
  if (records.length === 0) return [];

  const expiresAt =
    Math.floor(Date.now() / 1000) + AGGREGATE_TTL_DAYS * 24 * 60 * 60;

  const createMetricStats = (
    recs: WebVitalRecord[],
    metricName: WebVitalName,
  ): WebVitalMetricStats => {
    const filtered = recs.filter((r) => r.name === metricName);
    const values = filtered.map((r) => r.value);
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    const percentile = (p: number): number => {
      if (count === 0) return 0;
      const index = Math.ceil((p / 100) * count) - 1;
      return sorted[Math.max(0, index)] ?? 0;
    };

    const ratings: WebVitalRatings = { good: 0, needsImprovement: 0, poor: 0 };
    for (const rec of filtered) {
      if (rec.rating === 'good') ratings.good += SAMPLE_RATE_MULTIPLIER;
      else if (rec.rating === 'needs-improvement')
        ratings.needsImprovement += SAMPLE_RATE_MULTIPLIER;
      else ratings.poor += SAMPLE_RATE_MULTIPLIER;
    }

    return {
      count: count * SAMPLE_RATE_MULTIPLIER,
      histogram: {
        bins: buildHistogramBins(values, metricName).map(
          (bin) => bin * SAMPLE_RATE_MULTIPLIER,
        ),
      },
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      ratings,
    };
  };

  const countPageviews = (recs: WebVitalRecord[]): number => {
    const uniqueIds = new Set(recs.map((r) => r.id));
    return uniqueIds.size * SAMPLE_RATE_MULTIPLIER;
  };

  const createAggregate = (
    recs: WebVitalRecord[],
    pk: string,
    sk: string,
    gsiKeys?: Partial<
      Pick<
        WebVitalAggregate,
        'GSI1PK' | 'GSI1SK' | 'GSI2PK' | 'GSI2SK' | 'GSI3PK' | 'GSI3SK'
      >
    >,
    extras?: Partial<Pick<WebVitalAggregate, 'topCountries' | 'topRoutes'>>,
  ): WebVitalAggregate => {
    const CLS = createMetricStats(recs, 'CLS');
    const FCP = createMetricStats(recs, 'FCP');
    const INP = createMetricStats(recs, 'INP');
    const LCP = createMetricStats(recs, 'LCP');
    const TTFB = createMetricStats(recs, 'TTFB');
    const stats = { CLS, FCP, INP, LCP, TTFB };

    // Calculate RES using Vercel's methodology:
    // - Uses p75 values (not ratings) for each metric
    // - Applies Lighthouse 10 log-normal scoring curves
    // - Weighted: LCP 30%, INP 30%, CLS 25%, FCP 15%
    // - TTFB is intentionally excluded from RES
    const score = computeRESFromStats(stats);

    return {
      CLS,
      date,
      expiresAt,
      FCP,
      INP,
      LCP,
      pageviews: countPageviews(recs),
      pk,
      score,
      sk,
      TTFB,
      type: 'web-vital-aggregate',
      ...gsiKeys,
      ...extras,
    };
  };

  // Single dimensions
  const byRoute = new Map<string, WebVitalRecord[]>();
  const byCountry = new Map<string, WebVitalRecord[]>();
  const byDevice = new Map<string, WebVitalRecord[]>();

  // 2-way combos
  const byDeviceCountry = new Map<string, WebVitalRecord[]>();
  const byDeviceRoute = new Map<string, WebVitalRecord[]>();
  const byCountryRoute = new Map<string, WebVitalRecord[]>();

  // 3-way combo
  const byDeviceCountryRoute = new Map<string, WebVitalRecord[]>();

  for (const rec of records) {
    const route = rec.route;
    const country = rec.country;
    const device = rec.device.type;

    // Single dimensions
    (byRoute.get(route) ?? byRoute.set(route, []).get(route))?.push(rec);
    (byCountry.get(country) ?? byCountry.set(country, []).get(country))?.push(
      rec,
    );
    (byDevice.get(device) ?? byDevice.set(device, []).get(device))?.push(rec);

    // 2-way combos
    const dcKey = `${device}#${country}`;
    (
      byDeviceCountry.get(dcKey) ?? byDeviceCountry.set(dcKey, []).get(dcKey)
    )?.push(rec);

    const drKey = `${device}#${route}`;
    (byDeviceRoute.get(drKey) ?? byDeviceRoute.set(drKey, []).get(drKey))?.push(
      rec,
    );

    const crKey = `${country}#${route}`;
    (
      byCountryRoute.get(crKey) ?? byCountryRoute.set(crKey, []).get(crKey)
    )?.push(rec);

    // 3-way combo
    const dcrKey = `${device}#${country}#${route}`;
    (
      byDeviceCountryRoute.get(dcrKey) ??
      byDeviceCountryRoute.set(dcrKey, []).get(dcrKey)
    )?.push(rec);
  }

  const aggregates: WebVitalAggregate[] = [];

  // Build topRoutes and topCountries for SUMMARY
  const topRoutes: WebVitalTopItem[] = [];
  for (const [route, recs] of byRoute) {
    const agg = createAggregate(recs, '', '');
    topRoutes.push({
      pageviews: agg.pageviews,
      score: agg.score,
      value: route,
    });
  }
  topRoutes.sort((a, b) => b.pageviews - a.pageviews);

  const topCountries: WebVitalTopItem[] = [];
  for (const [country, recs] of byCountry) {
    const agg = createAggregate(recs, '', '');
    topCountries.push({
      pageviews: agg.pageviews,
      score: agg.score,
      value: country,
    });
  }
  topCountries.sort((a, b) => b.pageviews - a.pageviews);

  // SUMMARY
  aggregates.push(
    createAggregate(records, date, 'SUMMARY', undefined, {
      topCountries: topCountries.slice(0, 25),
      topRoutes: topRoutes.slice(0, 25),
    }),
  );

  // Routes (sk: R#<route>)
  for (const [route, recs] of byRoute) {
    aggregates.push(
      createAggregate(recs, date, `R#${route}`, {
        GSI1PK: `R#${route}`,
        GSI1SK: date,
      }),
    );
  }

  // Countries (sk: C#<country>)
  for (const [country, recs] of byCountry) {
    aggregates.push(
      createAggregate(recs, date, `C#${country}`, {
        GSI2PK: `C#${country}`,
        GSI2SK: date,
      }),
    );
  }

  // Devices (sk: D#<device>)
  for (const [device, recs] of byDevice) {
    aggregates.push(
      createAggregate(recs, date, `D#${device}`, {
        GSI3PK: `D#${device}`,
        GSI3SK: date,
      }),
    );
  }

  for (const [device, deviceRecs] of byDevice) {
    const pk = `${date}#D#${device}`;

    // SUMMARY for this device
    aggregates.push(createAggregate(deviceRecs, pk, 'SUMMARY'));

    // Routes for this device
    for (const [drKey, recs] of byDeviceRoute) {
      const [keyDevice, keyRoute] = drKey.split('#') as [string, string];
      if (keyDevice === device) {
        aggregates.push(createAggregate(recs, pk, `R#${keyRoute}`));
      }
    }

    // Countries for this device
    for (const [dcKey, recs] of byDeviceCountry) {
      const [keyDevice, keyCountry] = dcKey.split('#') as [string, string];
      if (keyDevice === device) {
        aggregates.push(createAggregate(recs, pk, `C#${keyCountry}`));
      }
    }
  }

  for (const [country, countryRecs] of byCountry) {
    const pk = `${date}#C#${country}`;

    // SUMMARY for this country
    aggregates.push(createAggregate(countryRecs, pk, 'SUMMARY'));

    // Routes for this country
    for (const [crKey, recs] of byCountryRoute) {
      const [keyCountry, keyRoute] = crKey.split('#') as [string, string];
      if (keyCountry === country) {
        aggregates.push(createAggregate(recs, pk, `R#${keyRoute}`));
      }
    }

    // Devices for this country
    for (const [dcKey, recs] of byDeviceCountry) {
      const [keyDevice, keyCountry] = dcKey.split('#') as [string, string];
      if (keyCountry === country) {
        aggregates.push(createAggregate(recs, pk, `D#${keyDevice}`));
      }
    }
  }

  for (const [dcKey, dcRecs] of byDeviceCountry) {
    const [device, country] = dcKey.split('#') as [string, string];
    const pk = `${date}#D#${device}#C#${country}`;

    // SUMMARY for this device + country combo
    aggregates.push(createAggregate(dcRecs, pk, 'SUMMARY'));

    // Routes for this device + country combo
    for (const [dcrKey, recs] of byDeviceCountryRoute) {
      const [keyDevice, keyCountry, keyRoute] = dcrKey.split('#') as [
        string,
        string,
        string,
      ];
      if (keyDevice === device && keyCountry === country) {
        aggregates.push(createAggregate(recs, pk, `R#${keyRoute}`));
      }
    }
  }

  return aggregates;
};

/**
 * Web Vitals aggregation Lambda: runs daily (00:05 UTC) and writes the
 * previous day's raw Web Vitals as pre-computed aggregates.
 */
export const handler = dailyAggregationHandler({
  aggregate: aggregateWebVitals,
  label: 'web-vitals-aggregate',
  source: 'WEB',
  tableName: () => Resource.MetricsWebVitalsAggregated.name,
});
