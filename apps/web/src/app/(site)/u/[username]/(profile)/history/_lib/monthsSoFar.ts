import { cacheLife } from 'next/cache';

/**
 * This year's months so far (UTC, 1–12), for Jump to's placeholder: the
 * opening year is usually this one, open at its months. Cached so the
 * static shell can read the clock; `short` (a day) at most puts the
 * placeholder a row off on the 1st.
 */
export async function monthsSoFar(): Promise<number> {
  'use cache';
  cacheLife('short');
  return new Date().getUTCMonth() + 1;
}
