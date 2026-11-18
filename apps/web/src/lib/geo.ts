import 'server-only';

import type { User } from '@tvseri.es/schemas';
import { headers } from 'next/headers';

const DEFAULT_REGION = 'US';

/** Geolocation headers in priority order: Vercel's, then CloudFront's. */
const GEO_HEADERS = [
  'x-vercel-ip-country',
  'cloudfront-viewer-country',
] as const;

type ReadonlyHeaders = Awaited<ReturnType<typeof headers>>;

/**
 * The visitor's ISO 3166-1 alpha-2 country from the geo headers, else
 * `fallback` ('US'). Pass `null` where a guessed region would be wrong (a
 * "detected" region).
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

/**
 * `resolveRegionFromHeaders` with the request's headers. Reads `headers()`:
 * only inside a Suspense boundary, never in a cached scope.
 */
export async function resolveRegion(
  user?: Readonly<Pick<User, 'country'>> | null,
): Promise<string> {
  return resolveRegionFromHeaders(user, await headers());
}
