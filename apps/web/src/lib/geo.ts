import type { User } from '@tvseri.es/schemas';
import { headers } from 'next/headers';

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
 * @param fallback - Returned when no geo header is present (default 'US').
 *   Pass `null` where a guessed region would be wrong, e.g. RUM metrics.
 * @returns ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'NL')
 */
export function getRegionFromHeaders(
  headerStore: Headers | ReadonlyHeaders,
): string;
export function getRegionFromHeaders<T>(
  headerStore: Headers | ReadonlyHeaders,
  fallback: T,
): string | T;
export function getRegionFromHeaders(
  headerStore: Headers | ReadonlyHeaders,
  fallback: unknown = DEFAULT_REGION,
) {
  for (const header of GEO_HEADERS) {
    const value = headerStore.get(header);
    if (value) {
      return value;
    }
  }

  return fallback;
}

/**
 * The region for watch providers, content ratings etc.: the user's saved
 * country, else the visitor's geo country, else 'US'. Uses `||` so an empty
 * saved country falls through too. Every region resolution goes through here
 * (or `resolveRegionFromHeaders` where the headers are at hand), so all
 * callers, and so all cache keys, agree.
 */
export function resolveRegionFromHeaders(
  user: Readonly<Pick<User, 'country'>> | null | undefined,
  headerStore: Headers | ReadonlyHeaders,
): string {
  return user?.country || getRegionFromHeaders(headerStore);
}

export async function resolveRegion(
  user?: Readonly<Pick<User, 'country'>> | null,
): Promise<string> {
  return resolveRegionFromHeaders(user, await headers());
}
