import 'server-only';

import type { StatsYears } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import {
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

import { statsTag, userTag } from './tags';

/**
 * The Years list: years with dated watches, newest first. Public and about
 * the profile owner, so it is `'use cache'` (tags `user:{id}` and
 * `stats:{id}`) on the `statsCurrent` profile, 5 minutes (it is current
 * within seconds at the API); a failed read is `Unavailable` on the
 * `unavailable` one.
 */
export async function getYears(
  userId: string,
): Promise<StatsYears | Unavailable> {
  'use cache';
  cacheTag(userTag(userId), statsTag(userId));
  const result = await tryApi(() =>
    apiFetch<StatsYears>('/user/:id/stats/years', { params: { id: userId } }),
  );
  if (isUnavailable(result)) {
    cacheLife('unavailable');
  } else {
    cacheLife('statsCurrent');
  }
  return result;
}
