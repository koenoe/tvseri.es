import 'server-only';

import { unstable_rethrow } from 'next/navigation';

/**
 * A part of the page that must not take the page down when its read fails
 * (rating, cast, keywords, where to watch, runtimes): logs and returns the
 * fallback, so the part renders empty and the rest of the show stays.
 * Next's own interruptions (prerender, redirect, not found) pass through.
 */
export async function orFallback<T>(
  read: Promise<T>,
  fallback: T,
  what: string,
): Promise<T> {
  try {
    return await read;
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[show] ${what} failed`, error);
    return fallback;
  }
}
