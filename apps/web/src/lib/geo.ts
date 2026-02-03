import { headers } from 'next/headers';

// import { connection } from 'next/server';

const DEFAULT_REGION = 'US';

/**
 * Header names for geolocation, in priority order.
 * - x-vercel-ip-country: Vercel's geo header (current hosting)
 * - cloudfront-viewer-country: AWS CloudFront header (legacy/fallback)
 */
const GEO_HEADERS = [
  'x-vercel-ip-country',
  'cloudfront-viewer-country',
] as const;

type ReadonlyHeaders = Awaited<ReturnType<typeof headers>>;

/**
 * Gets the user's country/region code from a Headers object.
 * Useful in API routes where you already have the headers.
 *
 * @param headerStore - Headers object from request
 * @returns ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'NL')
 */
export function getRegionFromHeaders(
  headerStore: Headers | ReadonlyHeaders,
): string {
  for (const header of GEO_HEADERS) {
    const value = headerStore.get(header);
    if (value) {
      return value;
    }
  }

  return DEFAULT_REGION;
}

/**
 * Gets the user's country/region code from request headers.
 * Checks Vercel headers first, falls back to CloudFront, then defaults to 'US'.
 *
 * @returns ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'NL')
 */
export async function getRegion(): Promise<string> {
  // await connection();
  return getRegionFromHeaders(await headers());
}
