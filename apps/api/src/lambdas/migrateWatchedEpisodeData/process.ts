import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSHandler,
} from 'aws-lambda';
import { Resource } from 'sst';

import dynamoClient from '@/lib/db/client';
import { fetchTvSeriesSeason } from '@/lib/tmdb';

type QueueMessage = {
  pk: string;
  sk: string;
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
};

// Custom error for rate limiting
class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Delay helper to avoid TMDB rate limits
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Cache for season data within the same Lambda invocation
const seasonCache = new Map<
  string,
  Map<number, { title: string; stillPath: string | null }>
>();

const getSeasonData = async (
  seriesId: number,
  seasonNumber: number,
): Promise<Map<number, { title: string; stillPath: string | null }> | null> => {
  const cacheKey = `${seriesId}-${seasonNumber}`;

  if (seasonCache.has(cacheKey)) {
    return seasonCache.get(cacheKey)!;
  }

  try {
    // Add small delay before each TMDB call to avoid rate limiting
    await delay(100);

    const season = await fetchTvSeriesSeason(seriesId, seasonNumber);
    if (!season?.episodes) {
      return null;
    }

    const episodeMap = new Map<
      number,
      { title: string; stillPath: string | null }
    >();
    for (const episode of season.episodes) {
      episodeMap.set(episode.episodeNumber, {
        stillPath: episode.stillPath,
        title: episode.title,
      });
    }

    seasonCache.set(cacheKey, episodeMap);
    return episodeMap;
  } catch (error) {
    // Check if it's a rate limit error (429)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      throw new RateLimitError(
        `Rate limited fetching season ${seasonNumber} for series ${seriesId}`,
      );
    }

    console.error(
      `Failed to fetch season ${seasonNumber} for series ${seriesId}:`,
      error,
    );
    return null;
  }
};

const updateWatchedItem = async (
  item: QueueMessage,
  episodeData: { title: string; stillPath: string | null },
) => {
  const command = new UpdateItemCommand({
    ExpressionAttributeNames: {
      '#episodeStillPath': 'episodeStillPath',
      '#episodeTitle': 'episodeTitle',
    },
    ExpressionAttributeValues: marshall({
      ':episodeStillPath': episodeData.stillPath,
      ':episodeTitle': episodeData.title,
    }),
    Key: marshall({
      pk: item.pk,
      sk: item.sk,
    }),
    TableName: Resource.Watched.name,
    UpdateExpression:
      'SET #episodeTitle = :episodeTitle, #episodeStillPath = :episodeStillPath',
  });

  await dynamoClient.send(command);
};

export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  console.log(`Processing ${event.Records.length} records`);

  const batchItemFailures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      const message: QueueMessage = JSON.parse(record.body);

      const seasonData = await getSeasonData(
        message.seriesId,
        message.seasonNumber,
      );

      if (!seasonData) {
        // Season not found on TMDB - don't retry, just log and skip
        console.warn(
          `No season data for series ${message.seriesId} season ${message.seasonNumber} - skipping (won't retry)`,
        );
        continue;
      }

      const episodeData = seasonData.get(message.episodeNumber);
      if (!episodeData) {
        // Episode not found on TMDB - don't retry, just log and skip
        console.warn(
          `No episode data for series ${message.seriesId} S${message.seasonNumber}E${message.episodeNumber} - skipping (won't retry)`,
        );
        continue;
      }

      await updateWatchedItem(message, episodeData);
      console.log(
        `Updated: series ${message.seriesId} S${message.seasonNumber}E${message.episodeNumber} -> "${episodeData.title}"`,
      );
    } catch (error) {
      // If rate limited, fail the entire remaining batch to back off
      if (error instanceof RateLimitError) {
        console.warn(`Rate limited - failing remaining messages for retry`);
        // Add all remaining records (including current) to failures
        const currentIndex = event.Records.indexOf(record);
        for (let i = currentIndex; i < event.Records.length; i++) {
          batchItemFailures.push({
            itemIdentifier: event.Records[i]!.messageId,
          });
        }
        break; // Exit the loop
      }

      // Only retry on actual errors (network issues, DynamoDB throttling, etc.)
      console.error(`Error processing message ${record.messageId}:`, error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
