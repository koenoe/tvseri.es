// Based on https://blog.burakcankus.com/2024/03/31/disable-aws-cloudfront-distributions-if-budget-is-exceeded.html
import {
  CloudFrontClient,
  ListDistributionsCommand,
} from '@aws-sdk/client-cloudfront';
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { Resource } from 'sst';

import { checkUsage } from './checkUsage';
import { LIMITS } from './limits';

const cloudFrontClient = new CloudFrontClient();
const cloudWatchClient = new CloudWatchClient();
const snsClient = new SNSClient();

/** Hourly: disables every CloudFront distribution once a monthly limit is reached */
export async function handler() {
  try {
    const result = await checkUsage({
      getMetricPage: ({ end, nextToken, queries, start }) =>
        cloudWatchClient.send(
          new GetMetricDataCommand({
            EndTime: end,
            MetricDataQueries: queries,
            NextToken: nextToken,
            StartTime: start,
          }),
        ),
      listDistributions: async () =>
        (await cloudFrontClient.send(new ListDistributionsCommand({})))
          .DistributionList?.Items ?? [],
      now: new Date(),
      publish: async (exceeded) => {
        await snsClient.send(
          new PublishCommand({
            Message: `Reached this month: ${exceeded.join(', ')}. Disabling all CloudFront distributions.`,
            Subject: 'CloudFront Metric Alert',
            TopicArn: Resource.BudgetAlertSNS.arn,
          }),
        );
      },
    });
    console.log(JSON.stringify({ ...result, limits: LIMITS }));
    return result;
  } catch (error) {
    console.error('[KILL SWITCH] Usage check failed', error);
    throw error;
  }
}
