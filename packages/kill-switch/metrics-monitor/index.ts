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
import { awsHttpOptions } from '@tvseri.es/constants';
import { Resource } from 'sst';
import { checkUsage } from './checkUsage';
import { LIMITS } from './limits';

// Connection timeout only: the Lambda's 5 s timeout already bounds a slow
// call, and a request timeout tight enough to leave room for a retry would
// cut CloudFront control-plane calls that are only slow
const requestHandler = awsHttpOptions(0);
const cloudFrontClient = new CloudFrontClient({ requestHandler });
const cloudWatchClient = new CloudWatchClient({ requestHandler });
const snsClient = new SNSClient({ requestHandler });

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
