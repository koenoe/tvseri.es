import 'server-only';

import { tryApi, type Unavailable } from '@/lib/cache/unavailable';
import { type ProfileCounts, readProfileCounts } from '@/lib/profile/counts';

import type { Profile } from './profile';

/**
 * The sidebar's meta lines: "5,341 episodes, 218 finished", "6 followers ·
 * 8 following" (what each count means: `@/lib/profile/counts`). Read per
 * request. A timeout or a 5xx is `Unavailable`, never a throw: the lines then
 * say so and the page stays.
 */
export function loadCounts(
  profile: Profile,
): Promise<ProfileCounts | Unavailable> {
  return tryApi(() => readProfileCounts(profile.user.id));
}
