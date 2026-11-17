import { API_METRICS_SAMPLE_RATE } from '@tvseri.es/constants';
import {
  APDEX_T,
  type Apdex,
  type ApiMetricAggregate,
  type ApiMetricRecord,
  type DependencyOperationStats,
  type DependencyStats,
  type PercentileStats,
  type StatusCodeBreakdown,
} from '@tvseri.es/schemas';
import { buildLatencyHistogramBins } from '@tvseri.es/utils';
import { Resource } from 'sst';
import {
  dailyAggregationHandler,
  sampleMultiplier,
} from '@/lib/metrics/dailyAggregation';
import {
  isValidTmdbEndpoint,
  normalizeDependencyEndpoint,
} from '@/lib/metrics/dependencyEndpoint';

const AGGREGATE_TTL_DAYS = 30;
/** Number of top items to store in leaderboards */
const TOP_ITEMS_LIMIT = 25;
/** Scales counts from sampled data back up to totals (10 for a 10% sample) */
const SAMPLE_RATE_MULTIPLIER = sampleMultiplier(API_METRICS_SAMPLE_RATE);

/** Latency thresholds for ratings (in ms) */
const LATENCY_FAST_THRESHOLD = 200;
const LATENCY_MODERATE_THRESHOLD = 500;

/**
 * Calculate percentile statistics from an array of numbers.
 * Includes histogram bins for accurate multi-day aggregation.
 * Counts are extrapolated based on SAMPLE_RATE_MULTIPLIER.
 */
const calculatePercentiles = (values: number[]): PercentileStats => {
  if (values.length === 0) {
    return {
      count: 0,
      histogram: { bins: [] },
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      ratings: { fast: 0, moderate: 0, slow: 0 },
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;

  const percentile = (p: number): number => {
    const index = Math.ceil((p / 100) * count) - 1;
    return sorted[Math.max(0, index)] as number;
  };

  // Calculate latency ratings
  let fast = 0;
  let moderate = 0;
  let slow = 0;
  for (const value of values) {
    if (value < LATENCY_FAST_THRESHOLD) {
      fast++;
    } else if (value < LATENCY_MODERATE_THRESHOLD) {
      moderate++;
    } else {
      slow++;
    }
  }

  // Build histogram and extrapolate bin counts from sample
  const rawBins = buildLatencyHistogramBins(values);
  const extrapolatedBins = rawBins.map((bin) => bin * SAMPLE_RATE_MULTIPLIER);

  return {
    count: count * SAMPLE_RATE_MULTIPLIER,
    histogram: { bins: extrapolatedBins },
    p75: percentile(75),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
    ratings: {
      fast: fast * SAMPLE_RATE_MULTIPLIER,
      moderate: moderate * SAMPLE_RATE_MULTIPLIER,
      slow: slow * SAMPLE_RATE_MULTIPLIER,
    },
  };
};

/**
 * Classify status code into category.
 */
const classifyStatusCode = (
  code: number,
): 'success' | 'redirect' | 'clientError' | 'serverError' => {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'redirect';
  if (code >= 400 && code < 500) return 'clientError';
  return 'serverError';
};

/**
 * Calculate Apdex (Application Performance Index) from latency values.
 *
 * Apdex is an open standard that measures user satisfaction:
 * - Satisfied: latency ≤ T
 * - Tolerating: T < latency ≤ 4T
 * - Frustrated: latency > 4T
 *
 * Score = (satisfied + tolerating × 0.5) / total
 */
const calculateApdex = (latencies: number[]): Apdex => {
  if (latencies.length === 0) {
    return { frustrated: 0, satisfied: 0, score: 1, tolerating: 0 };
  }

  const fourT = APDEX_T * 4;
  let satisfied = 0;
  let tolerating = 0;
  let frustrated = 0;

  for (const latency of latencies) {
    if (latency <= APDEX_T) {
      satisfied++;
    } else if (latency <= fourT) {
      tolerating++;
    } else {
      frustrated++;
    }
  }

  const total = latencies.length;
  const score = (satisfied + tolerating * 0.5) / total;

  // Extrapolate counts from sample, score stays the same (it's a ratio)
  return {
    frustrated: frustrated * SAMPLE_RATE_MULTIPLIER,
    satisfied: satisfied * SAMPLE_RATE_MULTIPLIER,
    score: Math.round(score * 100) / 100,
    tolerating: tolerating * SAMPLE_RATE_MULTIPLIER,
  };
};

/**
 * Aggregate API metrics into MetricsApi table.
 *
 * KEY DESIGN: Filters in pk, dimension in sk
 *
 * pk patterns:
 *   "<date>"                    → No filters
 *   "<date>#P#<platform>"       → Platform filter
 *   "<date>#C#<country>"        → Country filter
 *   "<date>#P#<platform>#C#<country>" → Platform + Country filter
 *
 * sk patterns:
 *   "SUMMARY"             → Totals for this filter combo
 *   "E#<method> <route>"  → Endpoint metrics (e.g., "E#GET /tv/:id")
 *   "P#<platform>"        → Platform metrics (when pk has no platform filter)
 *   "C#<country>"         → Country metrics (when pk has no country filter)
 */
const aggregateApiMetrics = (
  records: ApiMetricRecord[],
  date: string,
): ApiMetricAggregate[] => {
  if (records.length === 0) return [];

  const expiresAt =
    Math.floor(Date.now() / 1000) + AGGREGATE_TTL_DAYS * 24 * 60 * 60;

  const createStatusBreakdown = (
    recs: ApiMetricRecord[],
  ): StatusCodeBreakdown => {
    const breakdown: StatusCodeBreakdown = {
      clientError: 0,
      codes: {},
      redirect: 0,
      serverError: 0,
      success: 0,
    };
    for (const rec of recs) {
      // Category totals (extrapolated from sample)
      breakdown[classifyStatusCode(rec.statusCode)] += SAMPLE_RATE_MULTIPLIER;
      // Individual code counts (extrapolated from sample)
      const codeKey = String(rec.statusCode);
      breakdown.codes![codeKey] =
        (breakdown.codes![codeKey] ?? 0) + SAMPLE_RATE_MULTIPLIER;
    }
    return breakdown;
  };

  const calculateErrorRate = (breakdown: StatusCodeBreakdown): number => {
    const total =
      breakdown.success +
      breakdown.redirect +
      breakdown.clientError +
      breakdown.serverError;
    if (total === 0) return 0;
    return (breakdown.clientError + breakdown.serverError) / total;
  };

  const aggregateDependencies = (
    recs: ApiMetricRecord[],
  ): Record<string, DependencyStats> => {
    const depsBySource = new Map<
      string,
      {
        durations: number[];
        errorCount: number;
        byOperation: Map<
          string,
          {
            codes: Map<number, number>;
            durations: number[];
            errorCount: number;
          }
        >;
      }
    >();

    for (const rec of recs) {
      for (const dep of rec.dependencies) {
        const isError = dep.status >= 400 || dep.error !== undefined;

        if (
          dep.source.toLowerCase() === 'tmdb' &&
          !isValidTmdbEndpoint(dep.endpoint)
        ) {
          continue;
        }

        const normalizedOp = normalizeDependencyEndpoint(
          dep.source,
          dep.endpoint,
        );

        let sourceData = depsBySource.get(dep.source);
        if (!sourceData) {
          sourceData = {
            byOperation: new Map(),
            durations: [],
            errorCount: 0,
          };
          depsBySource.set(dep.source, sourceData);
        }

        sourceData.durations.push(dep.duration);
        if (isError) sourceData.errorCount++;

        let opData = sourceData.byOperation.get(normalizedOp);
        if (!opData) {
          opData = { codes: new Map(), durations: [], errorCount: 0 };
          sourceData.byOperation.set(normalizedOp, opData);
        }
        opData.durations.push(dep.duration);
        if (isError) opData.errorCount++;
        opData.codes.set(dep.status, (opData.codes.get(dep.status) ?? 0) + 1);
      }
    }

    const result: Record<string, DependencyStats> = {};
    for (const [
      source,
      { durations, errorCount, byOperation },
    ] of depsBySource) {
      const percentiles = calculatePercentiles(durations);
      // Extrapolate count from sample
      const count = durations.length * SAMPLE_RATE_MULTIPLIER;
      const throughput = count > 0 ? Math.round((count / 1440) * 100) / 100 : 0;

      const topOperations: DependencyOperationStats[] = [
        ...byOperation.entries(),
      ]
        .map(([operation, opData]) => {
          const opCount = opData.durations.length;
          const sorted = [...opData.durations].sort((a, b) => a - b);
          const percentile = (p: number): number => {
            const index = Math.ceil((p / 100) * opCount) - 1;
            return sorted[Math.max(0, index)] ?? 0;
          };

          const codes: Record<string, number> = {};
          for (const [status, count] of opData.codes) {
            codes[String(status)] = count;
          }

          return {
            codes,
            count: opCount,
            errorCount: opData.errorCount,
            errorRate:
              opCount > 0
                ? Math.round((opData.errorCount / opCount) * 10000) / 100
                : 0,
            histogram: { bins: buildLatencyHistogramBins(opData.durations) },
            operation,
            p75: percentile(75),
            p90: percentile(90),
            p95: percentile(95),
            p99: percentile(99),
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_ITEMS_LIMIT);

      result[source] = {
        ...percentiles,
        errorCount,
        errorRate:
          count > 0 ? Math.round((errorCount / count) * 10000) / 100 : 0,
        throughput,
        topOperations,
      };
    }
    return result;
  };

  /**
   * Build top endpoints leaderboard from a map of endpoint -> records.
   */
  const buildTopEndpoints = (
    endpointMap: Map<string, ApiMetricRecord[]>,
  ): Array<{
    apdexScore: number;
    dependencyNames: string[];
    endpoint: string;
    errorCount: number;
    errorRate: number;
    histogram: { bins: number[] };
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    requestCount: number;
  }> => {
    return [...endpointMap.entries()]
      .map(([endpoint, recs]) => {
        const latencies = recs.map((r) => r.latency);
        const sorted = [...latencies].sort((a, b) => a - b);
        const count = sorted.length;

        const percentile = (p: number): number => {
          const index = Math.ceil((p / 100) * count) - 1;
          return sorted[Math.max(0, index)] ?? 0;
        };

        const apdex = calculateApdex(latencies);
        const errorCount = recs.filter((r) => r.statusCode >= 400).length;
        const errorRate =
          count > 0 ? Math.round((errorCount / count) * 10000) / 100 : 0;

        // Collect unique dependency names
        const depNames = new Set<string>();
        for (const rec of recs) {
          for (const dep of rec.dependencies) {
            depNames.add(dep.source);
          }
        }

        // Extrapolate counts and histogram bins from sample
        const rawBins = buildLatencyHistogramBins(latencies);

        return {
          apdexScore: apdex.score,
          dependencyNames: [...depNames].sort(),
          endpoint,
          errorCount: errorCount * SAMPLE_RATE_MULTIPLIER,
          errorRate,
          histogram: { bins: rawBins.map((b) => b * SAMPLE_RATE_MULTIPLIER) },
          p75: percentile(75),
          p90: percentile(90),
          p95: percentile(95),
          p99: percentile(99),
          requestCount: count * SAMPLE_RATE_MULTIPLIER,
        };
      })
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, TOP_ITEMS_LIMIT);
  };

  /**
   * Calculate top countries for an endpoint.
   * Groups records by country and returns top N by request count.
   */
  const calculateTopCountries = (
    recs: ApiMetricRecord[],
  ): Array<{
    country: string;
    errorCount: number;
    errorRate: number;
    histogram: { bins: number[] };
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    requestCount: number;
  }> => {
    const byCountry = new Map<string, ApiMetricRecord[]>();

    for (const rec of recs) {
      const existing = byCountry.get(rec.country);
      if (existing) {
        existing.push(rec);
      } else {
        byCountry.set(rec.country, [rec]);
      }
    }

    return [...byCountry.entries()]
      .map(([country, countryRecs]) => {
        const latencies = countryRecs.map((r) => r.latency);
        const sorted = [...latencies].sort((a, b) => a - b);
        const count = sorted.length;

        const percentile = (p: number): number => {
          const index = Math.ceil((p / 100) * count) - 1;
          return sorted[Math.max(0, index)] ?? 0;
        };

        const errorCount = countryRecs.filter(
          (r) => r.statusCode >= 400,
        ).length;
        const errorRate =
          count > 0 ? Math.round((errorCount / count) * 10000) / 100 : 0;

        // Extrapolate counts and histogram bins from sample
        const rawBins = buildLatencyHistogramBins(latencies);

        return {
          country,
          errorCount: errorCount * SAMPLE_RATE_MULTIPLIER,
          errorRate,
          histogram: { bins: rawBins.map((b) => b * SAMPLE_RATE_MULTIPLIER) },
          p75: percentile(75),
          p90: percentile(90),
          p95: percentile(95),
          p99: percentile(99),
          requestCount: count * SAMPLE_RATE_MULTIPLIER,
        };
      })
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, TOP_ITEMS_LIMIT);
  };

  const createAggregate = (
    recs: ApiMetricRecord[],
    pk: string,
    sk: string,
    gsiKeys?: Partial<
      Pick<
        ApiMetricAggregate,
        'GSI1PK' | 'GSI1SK' | 'GSI2PK' | 'GSI2SK' | 'GSI3PK' | 'GSI3SK'
      >
    >,
    extras?: Partial<
      Pick<ApiMetricAggregate, 'dependencies' | 'topCountries' | 'topEndpoints'>
    >,
  ): ApiMetricAggregate => {
    const latencies = recs.map((r) => r.latency);
    const statusCodes = createStatusBreakdown(recs);

    return {
      apdex: calculateApdex(latencies),
      date,
      errorRate: calculateErrorRate(statusCodes),
      expiresAt,
      latency: calculatePercentiles(latencies),
      pk,
      requestCount: recs.length * SAMPLE_RATE_MULTIPLIER,
      sk,
      statusCodes,
      type: 'api-aggregate',
      ...gsiKeys,
      ...extras,
    };
  };

  // Single dimensions
  const byEndpoint = new Map<string, ApiMetricRecord[]>();
  const byPlatform = new Map<string, ApiMetricRecord[]>();
  const byCountry = new Map<string, ApiMetricRecord[]>();

  // 2-way combos
  const byPlatformCountry = new Map<string, ApiMetricRecord[]>();
  const byPlatformEndpoint = new Map<string, ApiMetricRecord[]>();
  const byCountryEndpoint = new Map<string, ApiMetricRecord[]>();

  // 3-way combo
  const byPlatformCountryEndpoint = new Map<string, ApiMetricRecord[]>();

  for (const rec of records) {
    const endpoint = `${rec.method} ${rec.route}`;
    const platform = rec.client.platform;
    const country = rec.country;

    // Single dimensions
    (
      byEndpoint.get(endpoint) ?? byEndpoint.set(endpoint, []).get(endpoint)
    )?.push(rec);
    (
      byPlatform.get(platform) ?? byPlatform.set(platform, []).get(platform)
    )?.push(rec);
    (byCountry.get(country) ?? byCountry.set(country, []).get(country))?.push(
      rec,
    );

    // 2-way combos
    const pcKey = `${platform}#${country}`;
    (
      byPlatformCountry.get(pcKey) ??
      byPlatformCountry.set(pcKey, []).get(pcKey)
    )?.push(rec);

    const peKey = `${platform}#${endpoint}`;
    (
      byPlatformEndpoint.get(peKey) ??
      byPlatformEndpoint.set(peKey, []).get(peKey)
    )?.push(rec);

    const ceKey = `${country}#${endpoint}`;
    (
      byCountryEndpoint.get(ceKey) ??
      byCountryEndpoint.set(ceKey, []).get(ceKey)
    )?.push(rec);

    // 3-way combo
    const pceKey = `${platform}#${country}#${endpoint}`;
    (
      byPlatformCountryEndpoint.get(pceKey) ??
      byPlatformCountryEndpoint.set(pceKey, []).get(pceKey)
    )?.push(rec);
  }

  const aggregates: ApiMetricAggregate[] = [];

  // Build top endpoints leaderboard (sorted by request count)
  const topEndpoints = buildTopEndpoints(byEndpoint);

  // SUMMARY - overall stats for the day
  aggregates.push(
    createAggregate(records, date, 'SUMMARY', undefined, {
      dependencies: aggregateDependencies(records),
      topEndpoints,
    }),
  );

  // Endpoints (sk: E#<endpoint>)
  for (const [endpoint, recs] of byEndpoint) {
    aggregates.push(
      createAggregate(
        recs,
        date,
        `E#${endpoint}`,
        {
          GSI1PK: `E#${endpoint}`,
          GSI1SK: date,
        },
        {
          dependencies: aggregateDependencies(recs),
          topCountries: calculateTopCountries(recs),
        },
      ),
    );
  }

  // Platforms (sk: P#<platform>)
  for (const [platform, recs] of byPlatform) {
    aggregates.push(
      createAggregate(recs, date, `P#${platform}`, {
        GSI2PK: `P#${platform}`,
        GSI2SK: date,
      }),
    );
  }

  // Countries (sk: C#<country>)
  for (const [country, recs] of byCountry) {
    aggregates.push(
      createAggregate(recs, date, `C#${country}`, {
        GSI3PK: `C#${country}`,
        GSI3SK: date,
      }),
    );
  }

  for (const [platform, platformRecs] of byPlatform) {
    const pk = `${date}#P#${platform}`;

    // Build top endpoints for this platform
    const platformEndpointMap = new Map<string, ApiMetricRecord[]>();
    for (const [key, recs] of byPlatformEndpoint) {
      if (key.startsWith(`${platform}#`)) {
        const endpoint = key.split('#').slice(1).join('#');
        platformEndpointMap.set(endpoint, recs);
      }
    }
    const platformEndpoints = buildTopEndpoints(platformEndpointMap);

    // SUMMARY for this platform
    aggregates.push(
      createAggregate(platformRecs, pk, 'SUMMARY', undefined, {
        dependencies: aggregateDependencies(platformRecs),
        topEndpoints: platformEndpoints,
      }),
    );

    // Endpoints for this platform
    for (const [peKey, recs] of byPlatformEndpoint) {
      const [keyPlatform, ...rest] = peKey.split('#');
      const keyEndpoint = rest.join('#');
      if (keyPlatform === platform) {
        aggregates.push(
          createAggregate(recs, pk, `E#${keyEndpoint}`, undefined, {
            dependencies: aggregateDependencies(recs),
            topCountries: calculateTopCountries(recs),
          }),
        );
      }
    }

    // Countries for this platform
    for (const [pcKey, recs] of byPlatformCountry) {
      const [keyPlatform, keyCountry] = pcKey.split('#') as [string, string];
      if (keyPlatform === platform) {
        aggregates.push(createAggregate(recs, pk, `C#${keyCountry}`));
      }
    }
  }

  for (const [country, countryRecs] of byCountry) {
    const pk = `${date}#C#${country}`;

    // Build top endpoints for this country
    const countryEndpointMap = new Map<string, ApiMetricRecord[]>();
    for (const [key, recs] of byCountryEndpoint) {
      if (key.startsWith(`${country}#`)) {
        const endpoint = key.split('#').slice(1).join('#');
        countryEndpointMap.set(endpoint, recs);
      }
    }
    const countryEndpoints = buildTopEndpoints(countryEndpointMap);

    // SUMMARY for this country
    aggregates.push(
      createAggregate(countryRecs, pk, 'SUMMARY', undefined, {
        dependencies: aggregateDependencies(countryRecs),
        topEndpoints: countryEndpoints,
      }),
    );

    // Endpoints for this country
    for (const [ceKey, recs] of byCountryEndpoint) {
      const [keyCountry, ...rest] = ceKey.split('#');
      const keyEndpoint = rest.join('#');
      if (keyCountry === country) {
        aggregates.push(
          createAggregate(recs, pk, `E#${keyEndpoint}`, undefined, {
            dependencies: aggregateDependencies(recs),
          }),
        );
      }
    }

    // Platforms for this country
    for (const [pcKey, recs] of byPlatformCountry) {
      const [keyPlatform, keyCountry] = pcKey.split('#') as [string, string];
      if (keyCountry === country) {
        aggregates.push(createAggregate(recs, pk, `P#${keyPlatform}`));
      }
    }
  }

  for (const [pcKey, pcRecs] of byPlatformCountry) {
    const [platform, country] = pcKey.split('#') as [string, string];
    const pk = `${date}#P#${platform}#C#${country}`;

    // Build top endpoints for this platform + country combo
    const pcEndpointMap = new Map<string, ApiMetricRecord[]>();
    for (const [key, recs] of byPlatformCountryEndpoint) {
      if (key.startsWith(`${platform}#${country}#`)) {
        const endpoint = key.split('#').slice(2).join('#');
        pcEndpointMap.set(endpoint, recs);
      }
    }
    const pcEndpoints = buildTopEndpoints(pcEndpointMap);

    // SUMMARY for this platform + country combo
    aggregates.push(
      createAggregate(pcRecs, pk, 'SUMMARY', undefined, {
        dependencies: aggregateDependencies(pcRecs),
        topEndpoints: pcEndpoints,
      }),
    );

    // Endpoints for this platform + country combo
    for (const [pceKey, recs] of byPlatformCountryEndpoint) {
      const [keyPlatform, keyCountry, ...rest] = pceKey.split('#');
      const keyEndpoint = rest.join('#');
      if (keyPlatform === platform && keyCountry === country) {
        aggregates.push(
          createAggregate(recs, pk, `E#${keyEndpoint}`, undefined, {
            dependencies: aggregateDependencies(recs),
          }),
        );
      }
    }
  }

  return aggregates;
};

/** Writes a day's raw API metrics as pre-computed aggregates */
export const apiAggregation = dailyAggregationHandler({
  aggregate: aggregateApiMetrics,
  label: 'api-aggregate',
  source: 'API',
  tableName: () => Resource.MetricsApiAggregated.name,
});
