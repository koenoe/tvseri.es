import 'server-only';

import { cache } from 'react';

import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { Resource } from 'sst';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';

import { getCacheItem, setCacheItem } from './db/cache';

const CACHE_PREFIX = 'detectDominantColorFromImage:v1:';

const lambda = new LambdaClient();

async function detectDominantColorFromImage(url: string): Promise<string> {
  try {
    const command = new InvokeCommand({
      FunctionName: Resource.DominantColor.name,
      Payload: JSON.stringify({ url }),
    });

    const response = await lambda.send(command);
    const result = JSON.parse(
      Buffer.from(response.Payload!).toString(),
    ) as Readonly<{
      color: string;
    }>;
    return result.color;
  } catch (error) {
    console.error('Error in detectDominantColorFromImage:', error);
    return DEFAULT_BACKGROUND_COLOR;
  }
}

const detectDominantColorFromImageWithCache = cache(
  async (url: string, cacheKey?: string) => {
    const key = `${CACHE_PREFIX}${cacheKey || url}`;
    const cachedValue = await getCacheItem<string>(key);
    if (cachedValue) {
      return cachedValue;
    }

    const dominantColor = await detectDominantColorFromImage(url);
    await setCacheItem<string>(key, dominantColor, { ttl: null });
    return dominantColor;
  },
);

export default detectDominantColorFromImageWithCache;
