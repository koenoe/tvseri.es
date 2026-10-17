import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { generateTmdbImageUrl } from '@tvseri.es/utils';
import { Resource } from 'sst';

import { getCacheItem, setCacheItem } from './db/cache';

const CACHE_PREFIX = 'detectDominantColorFromImage:v1:';

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

// TMDB image path, e.g. `/abc123.jpg`
const TMDB_IMAGE_PATH_REGEX = /^\/[A-Za-z0-9_-]+\.(?:jpe?g|png|svg|webp)$/;
// TMDB image size, e.g. `w780`, `original`, `w1920_and_h1080_multi_faces`
const TMDB_IMAGE_SIZE_REGEX =
  /^(?:original|w\d{2,4}(?:_and_h\d{2,4}_[a-z_]+)?)$/;

// Bound the time the request path waits for the DominantColor Lambda: one
// attempt (a timeout would otherwise be retried as transient), and make
// requestTimeout throw instead of only logging a warning. 8s leaves room for a
// cold start (sharp + image fetch) and stays under the API's 14s timeout.
const lambda = new LambdaClient({
  maxAttempts: 1,
  requestHandler: {
    connectionTimeout: 1000,
    requestTimeout: 8000,
    throwOnRequestTimeout: true,
  },
});

async function invokeDominantColorLambda(url: string) {
  const response = await lambda.send(
    new InvokeCommand({
      FunctionName: Resource.DominantColor.name,
      Payload: JSON.stringify({ url }),
    }),
  );

  // Invoke doesn't throw when the function itself errors
  if (response.FunctionError || !response.Payload) {
    throw new Error(
      `DominantColor Lambda failed: ${response.FunctionError ?? 'empty payload'}`,
    );
  }

  const result = JSON.parse(
    Buffer.from(response.Payload).toString(),
  ) as Readonly<{ color?: unknown }>;

  if (typeof result.color !== 'string' || !HEX_COLOR_REGEX.test(result.color)) {
    throw new Error('DominantColor Lambda returned an invalid color');
  }

  return result.color;
}

/**
 * Detects the dominant colour of a TMDB image (cached permanently per path).
 *
 * The URL is always built server-side from a validated TMDB path and size,
 * and the cache key is the path, so callers can't make the DominantColor
 * Lambda fetch arbitrary URLs or overwrite another image's colour.
 *
 * Returns `undefined` when detection fails. Failures are never cached.
 */
const detectDominantColorFromImage = async ({
  path,
  size = 'w780',
}: Readonly<{
  path: string;
  size?: string;
}>): Promise<string | undefined> => {
  if (!TMDB_IMAGE_PATH_REGEX.test(path) || !TMDB_IMAGE_SIZE_REGEX.test(size)) {
    return undefined;
  }

  const key = `${CACHE_PREFIX}${path}`;

  try {
    const cachedValue = await getCacheItem<string>(key);
    if (typeof cachedValue === 'string' && HEX_COLOR_REGEX.test(cachedValue)) {
      return cachedValue;
    }
  } catch (error) {
    // Cache is best-effort: fall through to detection
    console.warn('[dominant-color] cache read failed', error);
  }

  try {
    const dominantColor = await invokeDominantColorLambda(
      generateTmdbImageUrl(path, size),
    );
    await setCacheItem<string>(key, dominantColor, { ttl: null }).catch(
      (error: unknown) => {
        console.warn('[dominant-color] cache write failed', error);
      },
    );
    return dominantColor;
  } catch (error) {
    console.warn('[dominant-color] detection failed', error);
    return undefined;
  }
};

export default detectDominantColorFromImage;
