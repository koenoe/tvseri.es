import { PAGE_COLOR_VERSION } from '@tvseri.es/constants';
import { isHexColor, TMDB_IMAGE_PATH_REGEX } from '@tvseri.es/schemas';
import { generateTmdbImageUrl } from '@tvseri.es/utils';

import { createLimiter } from '@/utils/limit';

import { getCacheItems, setCacheItem } from './db/cache';
import { groundColor } from './groundColor';
import { invokeImageLambda } from './imageLambda';

/**
 * Colours stored under the current rule (`groundColor`, PAGE_COLOR_VERSION).
 * `v1` holds colours from before it (the Lambda's old rule: full white at
 * 4.5:1). They are read, never rewritten or deleted: a `v1` colour is put
 * through `groundColor` on its way out, which gives what a fresh detection
 * of the same image would within one 4% step, without a Lambda call.
 */
const CACHE_PREFIX = `detectDominantColorFromImage:v${PAGE_COLOR_VERSION}:`;
const LEGACY_CACHE_PREFIX = 'detectDominantColorFromImage:v1:';

// TMDB image size, e.g. `w780`, `original`, `w1920_and_h1080_multi_faces`
const TMDB_IMAGE_SIZE_REGEX =
  /^(?:original|w\d{2,4}(?:_and_h\d{2,4}_[a-z_]+)?)$/;

async function invokeDominantColorLambda(url: string) {
  const result = (await invokeImageLambda({ url })) as Readonly<{
    color?: unknown;
  }> | null;

  const color = result?.color;
  if (!isHexColor(color)) {
    throw new Error('DominantColor Lambda returned an invalid color');
  }

  return color;
}

const isValidImage = (path: string, size: string) =>
  TMDB_IMAGE_PATH_REGEX.test(path) && TMDB_IMAGE_SIZE_REGEX.test(size);

const cacheKey = (path: string) => `${CACHE_PREFIX}${path}`;
const legacyCacheKey = (path: string) => `${LEGACY_CACHE_PREFIX}${path}`;

/**
 * The stored colour of each path, as served: the current key's, else the
 * legacy key's through `groundColor` (both in one BatchGetItem). Paths with
 * neither are absent.
 */
const readStoredColors = async (paths: ReadonlyArray<string>) => {
  const colors = new Map<string, string>();
  if (paths.length === 0) {
    return colors;
  }
  try {
    const values = await getCacheItems<unknown>([
      ...paths.map(cacheKey),
      ...paths.map(legacyCacheKey),
    ]);
    for (const path of paths) {
      const color =
        groundColor(values.get(cacheKey(path))) ??
        groundColor(values.get(legacyCacheKey(path)));
      if (color) {
        colors.set(path, color);
      }
    }
  } catch (error) {
    // Cache is best-effort: fall through to detection
    console.warn('[dominant-color] cache read failed', error);
  }
  return colors;
};

// Runs the detection and caches the colour permanently. Returns `undefined`
// when detection fails; failures are never cached.
const detectAndCache = async (path: string, size: string) => {
  try {
    // The Lambda applies the rule itself; applied again (a no-op) so a
    // Lambda from before the rule can't store an older colour under v2
    const dominantColor = groundColor(
      await invokeDominantColorLambda(generateTmdbImageUrl(path, size)),
    );
    if (!dominantColor) {
      throw new Error('DominantColor Lambda returned an invalid color');
    }
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
 * The colour follows the page colour rule (`groundColor`), whichever rule it
 * was stored under. Returns `undefined` when detection fails. Failures are
 * never cached.
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

  return (
    (await readStoredColors([path])).get(path) ?? detectAndCache(path, size)
  );
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

  const stored = await readStoredColors(validPaths);

  const colors = new Map<string, string>();
  const limit = createLimiter(DETECT_CONCURRENCY);

  await Promise.all(
    validPaths.map(async (path) => {
      const color =
        stored.get(path) ?? (await limit(() => detectAndCache(path, size)));

      if (color) {
        colors.set(path, color);
      }
    }),
  );

  return colors;
};

export default detectDominantColorFromImage;
