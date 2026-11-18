import 'server-only';

import type { TasteMatchResponse } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

import { type Profile, withToken } from '../../_data/profile';

/**
 * `GET /user/:id/match`: how the viewer's taste meets the profile owner's
 * (level, shared shows, New to you, the split). Signed-in viewers only, so
 * never cached; memoised per render, so the card and the lanes share one call.
 */
export function loadMatch(profile: Profile): Promise<TasteMatchResponse> {
  return apiFetch<TasteMatchResponse>('/user/:id/match', {
    ...withToken(profile),
    params: { id: profile.user.id },
  });
}
