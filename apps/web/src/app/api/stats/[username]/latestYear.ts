import 'server-only';

import { getStatsUser } from '@/app/(site)/u/[username]/stats/[year]/_data/loaders';
import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';
import { getYears } from '@/lib/stats/getYears';

/**
 * The newest year a user's Stats page has something to show (a year with
 * dated episodes), `null` for a user with none, `'no-user'` for no such
 * user, or `Unavailable` when the API couldn't say. Cached loaders all the
 * way down.
 */
export async function latestStatsYear(
  username: string,
): Promise<number | null | 'no-user' | Unavailable> {
  const user = await getStatsUser(username);
  if (user === null) {
    return 'no-user';
  }
  if (isUnavailable(user)) {
    return user;
  }
  const years = await getYears(user.id);
  if (isUnavailable(years)) {
    return years;
  }
  return years.years.find((row) => row.episodes > 0)?.year ?? null;
}
