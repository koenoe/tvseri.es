/// <reference path="../.sst/platform/config.d.ts" />

/*
 * Two kill switches that disable every CloudFront distribution in the
 * account through one SNS topic and Lambda: a Budget alert, and an hourly
 * check of CloudFront's usage metrics, because Budget data only refreshes
 * about three times a day.
 *
 * Adapted from
 * https://github.com/laniakita/website/blob/main/infra/distribution-disablers.ts,
 * after Burak Can Kus, "Disable AWS CloudFront Distributions if Budget is
 * Exceeded":
 * https://blog.burakcankus.com/2024/03/31/disable-aws-cloudfront-distributions-if-budget-is-exceeded.html
 */

// CloudFront's metrics live in us-east-1.
const useast1 = new aws.Provider('useast1', { region: 'us-east-1' });
const current = await aws.getCallerIdentity({});

const killSwitchSnsTopic = new sst.aws.SnsTopic(
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
              // Only this account's budgets may publish (confused deputy)
              Condition: {
                StringEquals: { 'aws:SourceAccount': current.accountId },
              },
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

killSwitchSnsTopic.subscribe('KillSwitchSubscription', {
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

// Fires at 95% of the monthly limit
new aws.budgets.Budget('hard_budget', {
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

new sst.aws.Cron(
  'MonitorCloudFrontMetrics',
  {
    function: {
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

// A module (it has no imports or exports), for its top-level await
export {};
