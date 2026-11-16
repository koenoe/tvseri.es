import 'server-only';

import { apiFetch } from '@/lib/api/client';
import { tryApi, type Unavailable } from '@/lib/cache/unavailable';

import { type Profile, withToken } from './profile';

type Value = Readonly<{ value: boolean }>;

export type FollowState = Readonly<{
  /** The viewer follows the owner: Following / Follow */
  following: boolean;
  /** The owner follows the viewer: "Follows you" */
  followsYou: boolean;
}>;

/**
 * Both directions of the follow between viewer and owner (visitors only).
 * A timeout or a 5xx is `Unavailable`: the button then says it cannot tell,
 * instead of showing a guess.
 */
export async function loadFollowState(
  profile: Profile,
): Promise<FollowState | Unavailable> {
  if (profile.viewer === 'owner') {
    return { following: false, followsYou: false };
  }
  return tryApi(() => readFollowState(profile));
}

async function readFollowState(profile: Profile): Promise<FollowState> {
  const viewerId = profile.viewerId;
  const ownerId = profile.user.id;
  const [following, followsYou] = await Promise.all([
    apiFetch<Value>('/user/:id/following/:fid', {
      ...withToken(profile),
      params: { fid: ownerId, id: viewerId },
    }),
    apiFetch<Value>('/user/:id/following/:fid', {
      ...withToken(profile),
      params: { fid: viewerId, id: ownerId },
    }),
  ]);
  return { following: following.value, followsYou: followsYou.value };
}
