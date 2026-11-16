import 'server-only';

import { StatsZoneSchema } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import {
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

import { statsTag, userTag } from './tags';

/**
 * The zone a user's stats count in (IANA), so History can draw local days
 * without waiting on `/stats/years`. The API names it on
 * `GET /user/:id/stats/zone`, never stored by the CDN.
 *
 * Tagged `stats:{id}` and kept 5 minutes (`statsCurrent`): a change of
 * country shows within that. Concurrent calls in one render share one API
 * call (`'use cache'` dedupes).
 */
export async function getStatsTimeZone(
  userId: string,
): Promise<string | Unavailable> {
  'use cache';
  cacheTag(userTag(userId), statsTag(userId));
  const result = await tryApi(() =>
    apiFetch('/user/:id/stats/zone', {
      params: { id: userId },
      schema: StatsZoneSchema,
    }),
  );
  if (isUnavailable(result)) {
    cacheLife('unavailable');
    return result;
  }
  cacheLife('statsCurrent');
  return result.timeZone;
}
