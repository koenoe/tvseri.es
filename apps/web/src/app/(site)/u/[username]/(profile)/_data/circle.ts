import 'server-only';

import type { Circle } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

import { type Profile, withToken } from './profile';

/**
 * `GET /me/circle`: three picks from the people you follow (never cached: it
 * is yours). The one read of it; each block decides what its failure means.
 */
export function loadCircle(profile: Profile): Promise<Circle> {
  return apiFetch<Circle>('/me/circle', withToken(profile));
}
