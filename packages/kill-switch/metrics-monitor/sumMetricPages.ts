import type { GetMetricDataCommandOutput } from '@aws-sdk/client-cloudwatch';

export type MetricDataPage = Pick<
  GetMetricDataCommandOutput,
  'MetricDataResults' | 'NextToken'
>;

/**
 * Sums every value per metric label over all of GetMetricData's pages. One
 * call returns at most 100,800 data points and the rest behind `NextToken`
 * (newest first by default), so reading only the first page would drop the
 * month's oldest days and undercount.
 * https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricData.html
 */
export const sumMetricPages = async (
  getPage: (nextToken: string | undefined) => Promise<MetricDataPage>,
): Promise<Record<string, number>> => {
  const totals: Record<string, number> = {};
  let nextToken: string | undefined;
  do {
    const page = await getPage(nextToken);
    for (const metric of page.MetricDataResults ?? []) {
      if (metric.Label && metric.Values) {
        totals[metric.Label] =
          (totals[metric.Label] ?? 0) +
          metric.Values.reduce((sum, value) => sum + value, 0);
      }
    }
    nextToken = page.NextToken;
  } while (nextToken);
  return totals;
};
