import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { SQSHandler } from 'aws-lambda';
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

export const handler: SQSHandler = async (event) => {
  console.log(`Processing ${event.Records.length} records`);

  const failedMessageIds: string[] = [];

  for (const record of event.Records) {
    try {
      const message: QueueMessage = JSON.parse(record.body);

      const seasonData = await getSeasonData(
        message.seriesId,
        message.seasonNumber,
      );

      if (!seasonData) {
        console.warn(
          `No season data for series ${message.seriesId} season ${message.seasonNumber}`,
        );
        failedMessageIds.push(record.messageId);
        continue;
      }

      const episodeData = seasonData.get(message.episodeNumber);
      if (!episodeData) {
        console.warn(
          `No episode data for series ${message.seriesId} S${message.seasonNumber}E${message.episodeNumber}`,
        );
        failedMessageIds.push(record.messageId);
        continue;
      }

      await updateWatchedItem(message, episodeData);
      console.log(
        `Updated: series ${message.seriesId} S${message.seasonNumber}E${message.episodeNumber} -> "${episodeData.title}"`,
      );
    } catch (error) {
      console.error(`Error processing message ${record.messageId}:`, error);
      failedMessageIds.push(record.messageId);
    }
  }

  // Return partial batch failure response
  if (failedMessageIds.length > 0) {
    return {
      batchItemFailures: failedMessageIds.map((id) => ({
        itemIdentifier: id,
      })),
    };
  }
};
