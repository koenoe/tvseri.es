// originally from: https://blog.burakcankus.com/2024/03/31/disable-aws-cloudfront-distributions-if-budget-is-exceeded.html
// I've made some slight edits for typescript.
import {
  CloudFrontClient,
  ListDistributionsCommand,
} from '@aws-sdk/client-cloudfront';
import {
  CloudWatchClient,
  GetMetricDataCommand,
  type MetricDataQuery,
} from '@aws-sdk/client-cloudwatch';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type { Context } from 'aws-lambda';
import { Resource } from 'sst';

const cloudFrontClient = new CloudFrontClient();
const cloudWatchClient = new CloudWatchClient();
const snsClient = new SNSClient();

const SNSTopicARN = Resource.BudgetAlertSNS.arn;

const metricsToTrack = {
  distribution: ['Requests', 'BytesDownloaded'] as const,
  function: ['FunctionInvocations'] as const,
  limits: {
    BytesDownloaded: 1_000_000_000_000, // 1 TB per month
    FunctionInvocations: 10_000_000, // 10 million
    Requests: 10_000_000, // 10 million
    // AWS Always Free Tier limits
    // BytesDownloaded: 1_000_000_000_000, // 1 TB per month
    // FunctionInvocations: 2_000_000, // 2 million invocations per month
    // Requests: 10_000_000, // 10 million requests per month
  } as const,
};

export async function handler(event: Event, context: Context) {
  console.log(`Event: ${JSON.stringify(event)}`);
  console.log(`Context: ${JSON.stringify(context)}`);
  try {
    // Get a list of all CloudFront distributions
    const distributionsResponse = await cloudFrontClient.send(
      new ListDistributionsCommand({}),
    );

    // Creating a Set to store unique FunctionARN values
    const uniqueFunctionARNs = new Set<string>();

    // Extracting DefaultCacheBehavior FunctionAssociations
    distributionsResponse.DistributionList?.Items?.forEach((item) => {
      if (item.DefaultCacheBehavior?.FunctionAssociations?.Items) {
        item.DefaultCacheBehavior.FunctionAssociations.Items.forEach(
          (assoc) => {
            if (assoc.FunctionARN) {
              uniqueFunctionARNs.add(assoc.FunctionARN);
            }
          },
        );
      }
    });

    // Extracting CacheBehaviors FunctionAssociations
    distributionsResponse.DistributionList?.Items?.forEach((item) => {
      if (item.CacheBehaviors?.Items) {
        item.CacheBehaviors.Items.forEach((cacheBehavior) => {
          if (cacheBehavior.FunctionAssociations?.Items) {
            cacheBehavior.FunctionAssociations.Items.forEach((assoc) => {
              if (assoc.FunctionARN) {
                uniqueFunctionARNs.add(assoc.FunctionARN);
              }
            });
          }
        });
      }
    });

    // Converting Set to array
    const allFunctionARNs = Array.from(uniqueFunctionARNs);

    // Get the start and end dates for the current month
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Create an array to hold all the MetricDataQueries
    const metricDataQueries: MetricDataQuery[] = [];

    distributionsResponse.DistributionList?.Items?.forEach(
      (distribution, i) => {
        metricsToTrack.distribution.forEach((metric) => {
          metricDataQueries.push({
            Id: `distribution_${i + 1}_metric_${metric.toLowerCase()}`,
            MetricStat: {
              Metric: {
                Dimensions: [
                  { Name: 'DistributionId', Value: distribution.Id },
                  { Name: 'Region', Value: 'Global' },
                ],
                MetricName: metric,
                Namespace: 'AWS/CloudFront',
              },
              Period: 300,
              Stat: 'Sum',
            },
            ReturnData: true,
          });
        });
      },
    );

    allFunctionARNs.forEach((functionARN, i) => {
      metricsToTrack.function.forEach((metric) => {
        metricDataQueries.push({
          Id: `function_${i + 1}_metric_${metric.toLowerCase()}`,
          MetricStat: {
            Metric: {
              Dimensions: [
                {
                  Name: 'FunctionName',
                  Value: functionARN.split(':function/')[1],
                },
                { Name: 'Region', Value: 'Global' },
              ],
              MetricName: metric,
              Namespace: 'AWS/CloudFront',
            },
            Period: 300,
            Stat: 'Sum',
          },
          ReturnData: true,
        });
      });
    });

    // Execute all promises concurrently and wait for all of them to resolve
    const metricsResults = await fetchCloudWatchMetrics(
      metricDataQueries,
      startDate,
      endDate,
    );

    let exceeded = false;

    if (metricsResults) {
      Object.keys(metricsResults).forEach((metricType) => {
        const sum = metricsResults[metricType];
        const limit =
          metricsToTrack.limits[
            metricType as keyof typeof metricsToTrack.limits
          ];
        console.log(`Metric Type: ${metricType}, Sum: ${sum}, Limit: ${limit}`);
        if (sum != null && sum >= limit) {
          exceeded = true;
        }
      });
    }

    if (exceeded) {
      const params = {
        Message: `Metric limit has been exceeded. Disabling all CloudFront Distributions!`,
        Subject: 'CloudFront Metric Alert',
        TopicArn: SNSTopicARN,
      };
      await snsClient.send(new PublishCommand(params));
      console.log('SNS notification sent successfully.');

      return {
        body: 'All CloudFront Distributions will be disabled. Limits has been exceeded.',
        statusCode: 201,
      };
    }

    return {
      body: JSON.stringify(metricsResults),
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      body: 'An error occurred while retrieving CloudFront requests.',
      statusCode: 500,
    };
  }
}

async function fetchCloudWatchMetrics(
  metricDataQueries: MetricDataQuery[],
  startDate: Date,
  endDate: Date,
): Promise<Record<string, number> | null> {
  try {
    // Get CloudWatch metrics for the specified metrics and dimensions
    const metricDataResponse = await cloudWatchClient.send(
      new GetMetricDataCommand({
        EndTime: endDate,
        MetricDataQueries: metricDataQueries,
        StartTime: startDate,
      }),
    );

    const aggregatedMetrics: Record<string, number> = {};

    // Process the responses for each metric
    metricDataResponse.MetricDataResults?.forEach((metricData) => {
      const metricType = metricData.Label?.split(' ')[1];
      if (metricType && metricData.Values) {
        const sum = metricData.Values.reduce(
          (accumulator, currentValue) => accumulator + currentValue,
          0,
        );
        aggregatedMetrics[metricType] =
          (aggregatedMetrics[metricType] || 0) + sum;
      }
    });

    return aggregatedMetrics;
  } catch (error) {
    console.error('Error fetching metric data:', error);
    return null;
  }
}
