import { UsernameSchema } from '@tvseri.es/schemas';
import * as v from 'valibot';

import { lookupUsernameOwner } from '@/lib/profile/user';

import { ownPagesRoute, privateJson } from '../../handlers';

/**
 * Is `?username=` free for the signed-in viewer (`{ status: 'available' |
 * 'taken' }`)? Settings asks while the viewer types a new one. The lookup
 * answers 404 for a free one (`lookupUsernameOwner`, on its own CDN key);
 * the viewer's own username counts as free. Public data, but only a
 * signed-in viewer asks. A GET, not a server action: Next runs a tab's
 * actions one at a time, so a check per pause in typing would queue behind
 * (and hold up) the profile's Save.
 */
export const GET = ownPagesRoute(async (viewer, req) => {
  const username = req.nextUrl.searchParams.get('username') ?? '';
  if (!v.is(UsernameSchema, username)) {
    return privateJson({ error: 'InvalidUsername' }, 400);
  }
  const owner = await lookupUsernameOwner(username);
  return Response.json({
    status: owner && owner !== viewer.id ? 'taken' : 'available',
  });
});
