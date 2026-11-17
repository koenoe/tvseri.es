import 'server-only';

import type { ProfileCounts } from '@/lib/profile/counts';

import {
  getProfileCounts,
  getStatsUser,
  isUnavailable,
  type Loaded,
  type StatsUser,
} from '@/lib/stats/loaders';
import { loadYearRows, type YearRow } from './years';

/** The layout's params: the sidebar is per user, never per year */
export type StatsHeadParams = Promise<Readonly<{ username: string }>>;

type StatsHead = Readonly<{
  user: StatsUser;
  counts: Loaded<ProfileCounts>;
  rows: Loaded<ReadonlyArray<YearRow>>;
}>;

/**
 * What the sidebar and the phone head draw: the user, their counts and their
 * years, all cached per user. Null when there is no user to draw (unknown:
 * the page's 404; the lookup unavailable: the page's data-down view, which
 * the layout gives the whole width).
 */
export async function loadStatsHead(
  params: StatsHeadParams,
): Promise<StatsHead | null> {
  const { username } = await params;
  const user = await getStatsUser(username);
  if (!user || isUnavailable(user)) {
    return null;
  }
  const [counts, rows] = await Promise.all([
    getProfileCounts(user.id),
    loadYearRows(user.id),
  ]);
  return { counts, rows, user };
}
