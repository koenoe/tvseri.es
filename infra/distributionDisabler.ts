/// <reference path="../.sst/platform/config.d.ts" />

// https://github.com/laniakita/website/blob/main/infra/distribution-disablers.ts

/*
 * The following defines two different methods to
 * disable active CloudFront distributions in an
 * AWS account. Because it's important to disable
 * the distributions ASAP, these methods can be
 * referred to as "kill switches".
 *
 * The first kill switch is activated when a
 * Budget reaches a hard threshold, which will
 * send a notification to an SNS Topic, that
 * will invoke a Lambda function that can
 * actually bring down, and or disable, active
 * CloudFront distributions.
 *
 * The second kill switch is designed to avoid
 * the caveat of the first, which is the fact
 * that the AWS Budget metric is only updated
 * three times per day. This second switch,
 * routinely fetches usage metrics from CloudWatch
 * for all CloudFront distributions, and sends a
 * notification to the SNS Topic that invokes
 * the CloudFront disabler kill switch Lambda,
 * once the usage metrics are beyond the defined
 * usage limits.
 *
 * These CloudFront Distribution kill switch
 * methods are implementations of the ones
 * demonstrated by Burak Can Kus^1, in SST/Pulumi.
 * The Lambda function handlers are also heavily
 * inspired by their example source code.
 *
 * -----------------------------------------------
 *
 * 1. Disable AWS CloudFront Distributions
 *    if Budget is Exceeded.
 *    https://blog.burakcankus.com/2024/03/31/disable-aws-cloudfront-distributions-if-budget-is-exceeded.html.
 *    Retrieved Septermber 6th, 2024.
 *
 */

// CloudFront is global, so some thing's need to be deployed to US-EAST-1.
const useast1 = new aws.Provider('useast1', { region: 'us-east-1' });
// This let's us get our Account info dynamically.
// @ts-expect-error
const current = await aws.getCallerIdentity({});

/*
 * We create a new SNS Topic, which can be
 * connected to a budget alert, that upon
 * triggering, will notify it (SNS topic),
 * which will invoke our distribution
 * disabler function.
 */
export const killSwitchSnsTopic = new sst.aws.SnsTopic(
  'BudgetAlertSNS',
  {
    transform: {
      topic: {
        policy: $jsonStringify({
          Statement: [
            {
              Action: [
                'SNS:Subscribe',
                'SNS:SetTopicAttributes',
                'SNS:RemovePermission',
                'SNS:Receive',
                'SNS:Publish',
                'SNS:ListSubscriptionsByTopic',
                'SNS:GetTopicAttributes',
                'SNS:DeleteTopic',
                'SNS:AddPermission',
              ],
              Condition: {
                StringEquals: {
                  'AWS:SourceOwner': current.accountId,
                },
              },
              Effect: 'Allow',
              Principal: { AWS: '*' },
              Resource: '*',
              Sid: '__default_statement_ID',
            },
            {
              Action: 'SNS:Publish',
              Effect: 'Allow',
              Principal: { Service: 'budgets.amazonaws.com' },
              Resource: '*',
              Sid: 'BudgetAction',
            },
          ],
          Version: '2012-10-17',
        }),
      },
    },
  },
  { provider: useast1 },
);

// Subscribe the kill switch Lambda to the SNS topic
killSwitchSnsTopic.subscribe('KillSwitchSubscription', {
  architecture: 'arm64',
  handler:
    'packages/kill-switch/disable-cloudfront-distributions/index.handler',
  permissions: [
    {
      actions: [
        'cloudfront:ListDistributions',
        'cloudfront:UpdateDistribution',
        'cloudfront:GetDistributionConfig',
      ],
      resources: ['*'],
    },
  ],
  timeout: '5 seconds',
});

/*
 * This is the budget that will trigger the alert
 * to the "kill switch" SNS, once it's beyond
 * 95% of the "hard" budget threshold.
 */
export const hardBudget = new aws.budgets.Budget('hard_budget', {
  budgetType: 'COST',
  limitAmount: '50.00',
  limitUnit: 'USD',
  notifications: [
    {
      comparisonOperator: 'GREATER_THAN',
      notificationType: 'ACTUAL',
      subscriberSnsTopicArns: [killSwitchSnsTopic.arn],
      threshold: 95,
      thresholdType: 'PERCENTAGE',
    },
  ],
  timeUnit: 'MONTHLY',
});

/*
 * Because AWS only refreshes the Budget metrics 3x a day,
 * it might be a good idea to have a backup "kill switch".
 * The following creates a scheduled Lambda function that
 * periodically checks the current CloudFront usage metrics.
 * If the usage metrics are beyond the defined limits
 * (default: Free tier), it will trigger the "kill switch"
 * SNS Topic, which will invoke the distribution disabler
 * lambda function.
 */
export const monitorCloudFrontMetricsCron = new sst.aws.Cron(
  'MonitorCloudFrontMetrics',
  {
    function: {
      architecture: 'arm64',
      handler: 'packages/kill-switch/metrics-monitor/index.handler',
      link: [killSwitchSnsTopic],
      permissions: [
        {
          actions: ['cloudwatch:GetMetricData', 'cloudfront:ListDistributions'],
          resources: ['*'],
        },
        {
          actions: ['sns:Publish'],
          resources: [killSwitchSnsTopic.arn],
        },
      ],
      timeout: '5 seconds',
    },
    schedule: 'rate(1 hour)',
  },
  { provider: useast1 },
);
