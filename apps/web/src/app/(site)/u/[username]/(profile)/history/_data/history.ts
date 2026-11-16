import 'server-only';

import type { StatsYears } from '@tvseri.es/schemas';
import { cache } from 'react';

import { getDaily } from '@/app/(site)/u/[username]/stats/[year]/_data/loaders';
import { apiFetch } from '@/lib/api/client';
import {
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';
import { loadHistoryPage } from '@/lib/profile/pages';
import { getStatsTimeZone } from '@/lib/stats/timeZone';

import {
  jumpRange,
  type MonthKey,
  monthIndex,
  monthRange,
  newerMonth,
  thisWeek,
  thisWeekFromPage,
  weekYears,
} from '../_lib/diary';

/**
 * History's reads besides the diary's pages: the month index and month
 * lines (`/stats/years`, per request), This week (`/stats/:year/daily`,
 * cached), both public (never the viewer's token), and "Newer" (one whole
 * month above a jump).
 */

/**
 * `/stats/years` (months, undated), or `Unavailable`. Read per request like
 * the diary (the API computes it per request and never lets the CDN keep
 * it), not through the Stats page's 5-minute copy: the header total and the
 * month lines agree with the diary right after a mark. Deduped per render
 * across History's holes (`apiFetch`).
 */
export function loadHistoryYears(
  userId: string,
): Promise<StatsYears | Unavailable> {
  return tryApi(() =>
    apiFetch<StatsYears>('/user/:id/stats/years', { params: { id: userId } }),
  );
}

/** "This week · 1 episode · Wed 11" from the daily counts (two years across New Year), the owner's local week (`timeZone`) */
export async function loadThisWeek(
  userId: string,
  now: number,
  timeZone: string,
): Promise<ReturnType<typeof thisWeek> | Unavailable> {
  const dailies = await Promise.all(
    weekYears(now, timeZone).map((year) => getDaily(userId, year)),
  );
  const days = [];
  for (const daily of dailies) {
    if (isUnavailable(daily)) {
      return daily;
    }
    days.push(...daily.days);
  }
  return thisWeek(days, now, timeZone);
}

/**
 * The zone the diary's days and months are in: the owner's, the one their
 * stats count in (`getStatsTimeZone`, cached, one GetItem, so nothing waits
 * on `/stats/years`); UTC while it can't be read
 */
export async function loadHistoryTimeZone(userId: string): Promise<string> {
  const timeZone = await getStatsTimeZone(userId);
  return isUnavailable(timeZone) ? 'UTC' : timeZone;
}

/**
 * The diary's newest page, deduped per request (React `cache`): History's
 * page and its Jump-to sidebar both draw This week from it.
 */
const loadNewestPage = cache((accessToken: string, userId: string) =>
  loadHistoryPage({ accessToken, limit: 100, userId }),
);

/**
 * Starts the newest page before the zone is known (it needs none); whoever
 * awaits it later gets the same read. Observed here, so a read nobody ends
 * up awaiting leaves no unhandled rejection.
 */
function startNewestPage(
  read: Readonly<{ accessToken: string; userId: string }>,
): void {
  loadNewestPage(read.accessToken, read.userId).catch(() => undefined);
}

/**
 * The owner's This week: from the diary's newest page when it reaches back
 * before Monday (one small read, shared with the diary), else from the
 * year's daily counts.
 */
async function loadHistoryWeek(
  read: Readonly<{ accessToken: string; userId: string }>,
  now: number,
  timeZone: string,
): Promise<ReturnType<typeof thisWeek> | Unavailable> {
  const newest = await loadNewestPage(read.accessToken, read.userId);
  return (
    thisWeekFromPage(newest.items, newest.nextCursor !== null, now, timeZone) ??
    loadThisWeek(read.userId, now, timeZone)
  );
}

/**
 * History's first render: the years (month index, undated count),
 * the diary's first page and the owner's This week. The years are read in
 * parallel with the diary, not before it (the zone comes from
 * `getStatsTimeZone`). `month`: a jump's month, or null for the newest.
 */
export async function loadHistoryStart(
  read: Readonly<{ accessToken: string; userId: string }>,
  month: MonthKey | null,
  owner: boolean,
  now: number,
) {
  const years = loadHistoryYears(read.userId);
  // awaited below; observed now, so a failed zone read leaves no unhandled
  // rejection behind
  years.catch(() => undefined);
  if (!month || owner) {
    // the newest page needs no zone (the diary's first page, or This week's
    // source): it starts beside the zone read, and the call below shares it
    startNewestPage(read);
  }
  const timeZone = await loadHistoryTimeZone(read.userId);
  const [first, week, yearsAnswer] = await Promise.all([
    month
      ? loadHistoryPage({ ...read, ...jumpRange(month, timeZone), limit: 100 })
      : loadNewestPage(read.accessToken, read.userId),
    owner ? loadHistoryWeek(read, now, timeZone) : null,
    years,
  ]);
  return { first, timeZone, week, years: yearsAnswer };
}

/**
 * The owner's This week for History's Jump-to sidebar (in their zone), read
 * in parallel with the years it needs anyway (the month index).
 */
export async function loadJumpWeek(
  read: Readonly<{ accessToken: string; userId: string }>,
  now: number,
) {
  startNewestPage(read);
  const timeZone = await loadHistoryTimeZone(read.userId);
  return loadHistoryWeek(read, now, timeZone);
}

/** A month is at most this many reads of 100 (a 300-episode month is three) */
const MONTH_READS = 10;

/**
 * "Newer: April 2024": the whole month, read 100 at a time, with the month
 * above it as `prevCursor` (null at the newest).
 */
export async function loadNewerMonth(
  read: Readonly<{ accessToken: string; userId: string }>,
  key: MonthKey,
) {
  const [years, timeZone] = await Promise.all([
    loadHistoryYears(read.userId),
    loadHistoryTimeZone(read.userId),
  ]);
  const range = monthRange(key, timeZone);
  const items = [];
  let cursor: string | null = null;
  for (let index = 0; index < MONTH_READS; index++) {
    const page = await loadHistoryPage({
      ...read,
      ...range,
      cursor,
      limit: 100,
    });
    items.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) {
      break;
    }
  }
  const newer = isUnavailable(years)
    ? null
    : newerMonth(key, monthIndex(years.years));
  return { items, nextCursor: null, prevCursor: newer?.key ?? null };
}
