import { ScanCommand } from '@aws-sdk/client-dynamodb';
import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { Handler } from 'aws-lambda';
import { Resource } from 'sst';

import dynamoClient from '@/lib/db/client';

// Type assertion for migration queue - types are generated at deploy time
// biome-ignore lint/suspicious/noExplicitAny: SST types generated at deploy
const MigrateWatchedQueue = (Resource as any).MigrateWatchedQueue as {
  url: string;
};

type WatchedRecord = {
  pk: string;
  sk: string;
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle?: string;
  episodeStillPath?: string | null;
};

const sqsClient = new SQSClient({});
const SQS_BATCH_SIZE = 10; // SQS max batch size

export const handler: Handler = async (event) => {
  console.log('Starting to enqueue watched items for migration...');

  const dryRun = event?.dryRun ?? false;
  let scannedCount = 0;
  let enqueuedCount = 0;
  let skippedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const scanCommand = new ScanCommand({
      ExclusiveStartKey: lastEvaluatedKey
        ? marshall(lastEvaluatedKey)
        : undefined,
      Limit: 1000,
      TableName: Resource.Watched.name,
    });

    const scanResult = await dynamoClient.send(scanCommand);
    lastEvaluatedKey = scanResult.LastEvaluatedKey
      ? (unmarshall(scanResult.LastEvaluatedKey) as Record<string, unknown>)
      : undefined;

    const items = (scanResult.Items ?? []).map(
      (item) => unmarshall(item) as WatchedRecord,
    );
    scannedCount += items.length;

    // Filter items that need migration
    const itemsToMigrate = items.filter(
      (item) =>
        item.episodeTitle === undefined || item.episodeStillPath === undefined,
    );

    skippedCount += items.length - itemsToMigrate.length;

    if (itemsToMigrate.length === 0) {
      console.log(`Batch: ${items.length} scanned, 0 need migration`);
      continue;
    }

    // Send to SQS in batches
    for (let i = 0; i < itemsToMigrate.length; i += SQS_BATCH_SIZE) {
      const batch = itemsToMigrate.slice(i, i + SQS_BATCH_SIZE);

      if (dryRun) {
        console.log(`[DRY RUN] Would enqueue ${batch.length} items`);
        enqueuedCount += batch.length;
        continue;
      }

      const command = new SendMessageBatchCommand({
        Entries: batch.map((item, index) => ({
          Id: `${i + index}`,
          MessageBody: JSON.stringify({
            episodeNumber: item.episodeNumber,
            pk: item.pk,
            seasonNumber: item.seasonNumber,
            seriesId: item.seriesId,
            sk: item.sk,
          }),
          // Group by series+season to leverage FIFO and batch TMDB calls
          MessageGroupId: `${item.seriesId}-${item.seasonNumber}`,
        })),
        QueueUrl: MigrateWatchedQueue.url,
      });

      await sqsClient.send(command);
      enqueuedCount += batch.length;
    }

    console.log(
      `Progress: scanned=${scannedCount}, enqueued=${enqueuedCount}, skipped=${skippedCount}`,
    );
  } while (lastEvaluatedKey);

  const result = {
    dryRun,
    enqueuedCount,
    scannedCount,
    skippedCount,
  };

  console.log('Enqueue completed:', result);
  return result;
};
