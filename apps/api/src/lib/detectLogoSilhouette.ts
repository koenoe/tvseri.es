import { TMDB_IMAGE_PATH_REGEX } from '@tvseri.es/schemas';
import { generateTmdbImageUrl } from '@tvseri.es/utils';

import { logWarn } from '@/utils/logWarn';

import { readThrough } from './db/cache/readThrough';
import { invokeImageLambda } from './imageLambda';

const CACHE_PREFIX = 'detectLogoSilhouette:v1:';

/** The size the web draws network logos at, so the check sees the same file */
const LOGO_SIZE = 'w500';

/** Asks the image Lambda; throws when it gives no answer */
const checkLogo = async (path: string): Promise<boolean> => {
  const result = (await invokeImageLambda({
    mode: 'logo',
    url: generateTmdbImageUrl(path, LOGO_SIZE),
  })) as Readonly<{ silhouette?: unknown }> | null;
  if (typeof result?.silhouette !== 'boolean') {
    throw new Error('DominantColor Lambda returned no logo answer');
  }
  return result.silhouette;
};

/**
 * Whether a network's TMDB logo still reads as a white silhouette (see
 * `survivesSilhouette`), checked once per logo path by the image Lambda
 * and stored for good: one cache read per call, one Lambda run per new logo.
 *
 * The URL is built here from a validated TMDB path, so a caller can't make
 * the Lambda fetch an arbitrary URL. `undefined` for an invalid path or a
 * failed check (never stored, so the next call tries again); the web then
 * draws the silhouette, as for a logo that passes.
 */
export async function detectLogoSilhouette(
  path: string,
): Promise<boolean | undefined> {
  if (!TMDB_IMAGE_PATH_REGEX.test(path)) {
    return undefined;
  }
  // Stored for good: a TMDB path never changes its pixels
  return readThrough(`${CACHE_PREFIX}${path}`, null, () =>
    checkLogo(path),
  ).catch((error: unknown) => {
    logWarn('Logo silhouette check failed', error);
    return undefined;
  });
}
