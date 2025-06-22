import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { Resource } from 'sst';

import { getCacheItem, setCacheItem } from './db/cache';

const CACHE_PREFIX = 'detectDominantColorFromImage:v1:';

const lambda = new LambdaClient();

async function detectDominantColorFromImage(url: string): Promise<string> {
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
}

const detectDominantColorFromImageWithCache = async (
  url: string,
  cacheKey?: string,
) => {
  const key = `${CACHE_PREFIX}${cacheKey || url}`;
  const cachedValue = await getCacheItem<string>(key);
  if (cachedValue) {
    return cachedValue;
  }

  try {
    const dominantColor = await detectDominantColorFromImage(url);
    await setCacheItem<string>(key, dominantColor, { ttl: null });
    return dominantColor;
  } catch (_error) {
    return '#000000';
  }
};

export default detectDominantColorFromImageWithCache;
