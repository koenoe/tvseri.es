import 'server-only';

import type { CirclePeople, Page } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';
import { loadFollowPage } from '@/lib/profile/pages';
import type { FollowItem } from '@/lib/profile/views';

import { type Profile, withToken } from '../../_data/profile';

/**
 * Your own Circle (`GET /me/circle/people`): everyone you follow with the
 * match, ranked, and who follows you that you don't follow back. One call,
 * never cached (it is yours). A failure throws to the page's `Hole`.
 */
export function loadCirclePeople(profile: Profile): Promise<CirclePeople> {
  return apiFetch<CirclePeople>('/me/circle/people', withToken(profile));
}

export type VisitorCircle = Readonly<{
  following: Page<FollowItem>;
  followers: Page<FollowItem>;
}>;

/**
 * Someone else's Circle: the first page of who they follow and who follows
 * them, each row with what that person is watching (`include=watching`, 24
 * a page). The rest load as you scroll (`/api/u/:username/social/:type`).
 */
export async function loadVisitorCircle(
  profile: Profile,
): Promise<VisitorCircle> {
  const read = { accessToken: profile.accessToken, userId: profile.user.id };
  const [following, followers] = await Promise.all([
    loadFollowPage('following', read),
    loadFollowPage('followers', read),
  ]);
  return { followers, following };
}
