import type { DistributionSummary } from '@aws-sdk/client-cloudfront';
import type { MetricDataQuery } from '@aws-sdk/client-cloudwatch';

import { LIMITS } from './limits';
import { monthWindow } from './monthWindow';
import { type MetricDataPage, sumMetricPages } from './sumMetricPages';

type Limit = keyof typeof LIMITS;

export type UsageDeps = Readonly<{
  listDistributions: () => Promise<ReadonlyArray<DistributionSummary>>;
  getMetricPage: (
    input: Readonly<{
      queries: MetricDataQuery[];
      start: Date;
      end: Date;
      nextToken: string | undefined;
    }>,
  ) => Promise<MetricDataPage>;
  /** Alerts the kill switch's SNS topic, which disables every distribution */
  publish: (exceeded: ReadonlyArray<Limit>) => Promise<void>;
  now: Date;
}>;

const query = (
  id: string,
  metric: Limit,
  dimension: Readonly<{ Name: string; Value: string }>,
): MetricDataQuery => ({
  Id: id,
  // Without a Label, CloudWatch labels the result with more than the name
  Label: metric,
  MetricStat: {
    Metric: {
      Dimensions: [dimension, { Name: 'Region', Value: 'Global' }],
      MetricName: metric,
      Namespace: 'AWS/CloudFront',
    },
    Period: 300,
    Stat: 'Sum',
  },
  ReturnData: true,
});

/** The CloudFront Functions on any behaviour of any distribution, once each */
const functionNames = (distributions: ReadonlyArray<DistributionSummary>) => [
  ...new Set(
    distributions
      .flatMap((d) => [
        d.DefaultCacheBehavior,
        ...(d.CacheBehaviors?.Items ?? []),
      ])
      .flatMap((behaviour) => behaviour?.FunctionAssociations?.Items ?? [])
      .flatMap((association) => {
        const name = association.FunctionARN?.split(':function/')[1];
        return name ? [name] : [];
      }),
  ),
];

/**
 * Sums this month's CloudFront usage over every distribution and function
 * and alerts the kill switch when a limit is reached. Errors are thrown, not
 * caught: a run that can't read the metrics must fail (the Lambda's Errors
 * metric, the scheduler's retries), never pass as "under the limits".
 */
export const checkUsage = async (deps: UsageDeps) => {
  const distributions = await deps.listDistributions();
  const queries = [
    ...distributions.flatMap((distribution, i) =>
      (['Requests', 'BytesDownloaded'] as const).map((metric) =>
        query(`distribution_${i + 1}_${metric.toLowerCase()}`, metric, {
          Name: 'DistributionId',
          Value: distribution.Id ?? '',
        }),
      ),
    ),
    ...functionNames(distributions).map((name, i) =>
      query(`function_${i + 1}_functioninvocations`, 'FunctionInvocations', {
        Name: 'FunctionName',
        Value: name,
      }),
    ),
  ];
  const { endDate, startDate } = monthWindow(deps.now);
  const totals = await sumMetricPages((nextToken) =>
    deps.getMetricPage({ end: endDate, nextToken, queries, start: startDate }),
  );
  const exceeded = (Object.keys(LIMITS) as Limit[]).filter(
    (limit) => (totals[limit] ?? 0) >= LIMITS[limit],
  );
  if (exceeded.length > 0) {
    await deps.publish(exceeded);
  }
  return { exceeded, totals };
};
