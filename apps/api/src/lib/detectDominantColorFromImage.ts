import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { generateTmdbImageUrl } from '@tvseri.es/utils';
import { Resource } from 'sst';

import { createLimiter } from '@/utils/limit';

import { getCacheItem, getCacheItems, setCacheItem } from './db/cache';

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

const isValidImage = (path: string, size: string) =>
  TMDB_IMAGE_PATH_REGEX.test(path) && TMDB_IMAGE_SIZE_REGEX.test(size);

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_COLOR_REGEX.test(value);

const cacheKey = (path: string) => `${CACHE_PREFIX}${path}`;

// Runs the detection and caches the colour permanently. Returns `undefined`
// when detection fails; failures are never cached.
const detectAndCache = async (path: string, size: string) => {
  try {
    const dominantColor = await invokeDominantColorLambda(
      generateTmdbImageUrl(path, size),
    );
    await setCacheItem<string>(cacheKey(path), dominantColor, {
      ttl: null,
    }).catch((error: unknown) => {
      console.warn('[dominant-color] cache write failed', error);
    });
    return dominantColor;
  } catch (error) {
    console.warn('[dominant-color] detection failed', error);
    return undefined;
  }
};

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
  if (!isValidImage(path, size)) {
    return undefined;
  }

  try {
    const cachedValue = await getCacheItem<string>(cacheKey(path));
    if (isHexColor(cachedValue)) {
      return cachedValue;
    }
  } catch (error) {
    // Cache is best-effort: fall through to detection
    console.warn('[dominant-color] cache read failed', error);
  }

  return detectAndCache(path, size);
};

// Parallel DominantColor Lambda invocations per request
const DETECT_CONCURRENCY = 8;

/**
 * `detectDominantColorFromImage` for many images at once (e.g. every watch
 * provider in a region): one batched cache read, then bounded concurrency for
 * the detections that are still missing. Returns the colours by path; paths
 * that are invalid or failed detection are absent.
 */
export const detectDominantColorsFromImages = async ({
  paths,
  size = 'w780',
}: Readonly<{
  paths: ReadonlyArray<string>;
  size?: string;
}>): Promise<Map<string, string>> => {
  const validPaths = [...new Set(paths)].filter((path) =>
    isValidImage(path, size),
  );

  let cachedValues = new Map<string, unknown>();
  try {
    cachedValues = await getCacheItems<unknown>(validPaths.map(cacheKey));
  } catch (error) {
    // Cache is best-effort: fall through to detection
    console.warn('[dominant-color] cache read failed', error);
  }

  const colors = new Map<string, string>();
  const limit = createLimiter(DETECT_CONCURRENCY);

  await Promise.all(
    validPaths.map(async (path) => {
      const cachedValue = cachedValues.get(cacheKey(path));
      const color = isHexColor(cachedValue)
        ? cachedValue
        : await limit(() => detectAndCache(path, size));

      if (color) {
        colors.set(path, color);
      }
    }),
  );

  return colors;
};

export default detectDominantColorFromImage;
