/// <reference path="../.sst/platform/config.d.ts" />

/**
 * Queue failure alerts (production only): one CloudWatch alarm per
 * dead-letter queue, firing as soon as a message lands there, to an SNS topic.
 * About $0.10 per alarm per month.
 *
 * Who gets the email: set `ALERT_EMAIL` in the production deploy's
 * environment (a subscription is created; AWS sends a confirmation mail), or
 * subscribe an address to the `QueueFailureAlerts` topic once in the console.
 */
const isProduction = $app.stage === 'production';

const alertTopic = isProduction
  ? new sst.aws.SnsTopic('QueueFailureAlerts')
  : undefined;

if (alertTopic && process.env.ALERT_EMAIL) {
  new aws.sns.TopicSubscription('QueueFailureAlertsEmail', {
    endpoint: process.env.ALERT_EMAIL,
    protocol: 'email',
    topic: alertTopic.arn,
  });
}

/** Alarms when a dead-letter queue holds any message (production only) */
export const alarmOnDeadLetters = (
  name: string,
  queue: sst.aws.Queue,
): void => {
  if (!alertTopic) {
    return;
  }
  new aws.cloudwatch.MetricAlarm(`${name}Alarm`, {
    alarmActions: [alertTopic.arn],
    alarmDescription: `Messages in ${name}: a queue or stream consumer failed after all retries`,
    comparisonOperator: 'GreaterThanThreshold',
    dimensions: { QueueName: queue.nodes.queue.name },
    evaluationPeriods: 1,
    metricName: 'ApproximateNumberOfMessagesVisible',
    namespace: 'AWS/SQS',
    okActions: [alertTopic.arn],
    period: 300,
    statistic: 'Maximum',
    threshold: 0,
    treatMissingData: 'notBreaching',
  });
};
