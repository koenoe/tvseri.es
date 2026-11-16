import 'server-only';

import type { NextRequest } from 'next/server';

import auth from '@/auth';
import type { Viewer } from '@/auth/viewer';
import { resolveProfileUser } from '@/lib/profile/user';

import { privateJson } from '../handlers';

/**
 * The `/api/u/:username/*` handlers' profile, inside `viewerRoute` (which has
 * verified the viewer from the JWT; a visitor costs no `/me` call): the
 * read's token and the profile's id (what the reads take), or a 404 for an
 * unknown username. The viewer's own profile resolves like the page's
 * (`resolveProfileUser`).
 */
export default async function requireProfile(
  req: NextRequest,
  viewer: Viewer,
  username: string,
): Promise<Readonly<{ accessToken: string; userId: string }> | Response> {
  const found = await resolveProfileUser(
    username,
    viewer.id,
    async () => (await auth(req)).user,
  );
  if (!found) {
    return privateJson({ error: 'User not found' }, 404);
  }
  return {
    accessToken: viewer.accessToken,
    userId: found.user.id,
  };
}
