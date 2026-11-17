import 'server-only';

import type { NextRequest } from 'next/server';

import { checkUser } from './me';
import { getViewer } from './viewer';

/**
 * Why `auth()` has no user: `unauthenticated` when there is no session or
 * its account is gone, `failed` when the session is valid but `GET /me`
 * couldn't be read (an API outage). An outage must never read as signed
 * out: the person would be asked to sign in while they are. In a render
 * the second `GET /me` is the memoised first one; elsewhere it asks again,
 * on this failure path only.
 */
export async function missingUser(
  req?: NextRequest,
): Promise<'unauthenticated' | 'failed'> {
  const viewer = await getViewer(req);
  if (!viewer) {
    return 'unauthenticated';
  }
  const check = await checkUser(viewer.accessToken);
  return check.kind === 'gone' ? 'unauthenticated' : 'failed';
}
