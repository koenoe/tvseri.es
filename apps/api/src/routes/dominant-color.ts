import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { Hono } from 'hono';
import { Resource } from 'sst';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';

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

const detectDominantColorFromImageWithCache = async ({
  url,
  cacheKey,
}: Readonly<{
  url: string;
  cacheKey: string;
}>) => {
  const key = `${CACHE_PREFIX}${cacheKey}`;
  const cachedValue = await getCacheItem<string>(key);
  if (cachedValue) {
    return cachedValue;
  }

  try {
    const dominantColor = await detectDominantColorFromImage(url);
    await setCacheItem<string>(key, dominantColor, { ttl: null });
    return dominantColor;
  } catch (_error) {
    return '#000000'; // Default to black if there's an error
  }
};

const app = new Hono();

app.get('/', async (c) => {
  const url = c.req.query('url');
  if (!url) {
    return c.json({ error: 'No url provided' }, 400);
  }

  const cacheKey = c.req.query('cache_key') ?? url;
  const dominantColor = await detectDominantColorFromImageWithCache({
    url,
    cacheKey,
  });

  c.header(
    'Cache-Control',
    'public, max-age=31536000, s-maxage=31536000, immutable',
  );

  return c.json({
    hex: dominantColor,
  });
});

export default app;
