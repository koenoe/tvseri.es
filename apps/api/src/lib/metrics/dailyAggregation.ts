import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { ScheduledHandler } from 'aws-lambda';

import { AGGREGATE_RETRY, batchWrite } from '@/lib/db/batch';
import { fetchRawMetrics } from '@/lib/metrics/rawShards';

const dynamoClient = new DynamoDBClient({});

/** How much a sampled count is scaled back up by: 10 for a 10% sample */
export const sampleMultiplier = (sampleRate: number) =>
  Math.round(1 / sampleRate);

/**
 * A daily aggregation: reads one day's raw metrics (every shard of
 * `<source>#<date>`), aggregates them and writes the aggregates.
 *
 * By default it aggregates the PREVIOUS day, so all metrics are collected.
 * A manual run can name the day: `{ "aggregation": "api", "date": "2025-12-11" }`.
 */
export const dailyAggregationHandler =
  <RawRecord, Aggregate extends Record<string, unknown>>({
    aggregate,
    label,
    source,
    tableName,
  }: Readonly<{
    aggregate: (records: RawRecord[], date: string) => Aggregate[];
    /** The log lines' prefix, e.g. `api-aggregate` */
    label: string;
    /** The raw metrics' partition prefix */
    source: 'API' | 'WEB';
    /** The aggregates' table, read when the handler runs (an SST link) */
    tableName: () => string;
  }>): ScheduledHandler =>
  async (event) => {
    // Allow overriding date via event payload for manual runs/testing
    const eventDate =
      event && typeof event === 'object' && 'date' in event
        ? (event as { date: string }).date
        : null;

    let dateStr: string;
    if (eventDate) {
      dateStr = eventDate;
      console.log(`[${label}] Using provided date: ${dateStr}`);
    } else {
      const previousDay = new Date();
      previousDay.setDate(previousDay.getDate() - 1);
      dateStr = previousDay.toISOString().split('T')[0] as string;
    }

    // The full day. sk is "{timestamp}#{id}": the ~ suffix (ASCII 126, after
    // alphanumerics) captures every record of the last timestamp
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z~`;

    console.log(`[${label}] Processing date ${dateStr}`);

    const rawMetrics = await fetchRawMetrics<RawRecord>(
      dynamoClient,
      `${source}#${dateStr}`,
      dayStart,
      dayEnd,
    );
    console.log(`[${label}] Found ${rawMetrics.length} raw metrics`);

    if (rawMetrics.length === 0) {
      console.log(`[${label}] No metrics to aggregate`);
      return;
    }

    const aggregates = aggregate(rawMetrics, dateStr);
    console.log(`[${label}] Created ${aggregates.length} aggregates`);

    if (aggregates.length > 0) {
      // 25-item batches, retrying UnprocessedItems (cron backoff); throws if
      // any are left
      await batchWrite(
        tableName(),
        aggregates.map((item) => ({
          PutRequest: { Item: marshall(item, { removeUndefinedValues: true }) },
        })),
        AGGREGATE_RETRY,
      );
    }

    console.log(`[${label}] Done`);
  };
