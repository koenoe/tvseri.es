import { loadFollowPage } from '@/lib/profile/pages';

import { privateJson, viewerRoute } from '../../../../handlers';
import requireProfile from '../../../requireProfile';

type Context = Readonly<{
  params: Promise<{ type: string; username: string }>;
}>;

const isType = (value: string): value is 'followers' | 'following' =>
  value === 'followers' || value === 'following';

/**
 * The next pages of someone else's Circle: who they follow and who follows
 * them, each row with what that person is watching (24 a page, the API's
 * cap for that read).
 */
export const GET = viewerRoute(async (viewer, req, { params }: Context) => {
  const { type, username } = await params;
  if (!isType(type)) {
    return privateJson({ error: 'Invalid type' }, 400);
  }
  const gate = await requireProfile(req, viewer, username);
  if (gate instanceof Response) {
    return gate;
  }
  const read = { ...gate, cursor: req.nextUrl.searchParams.get('cursor') };
  return Response.json(await loadFollowPage(type, read));
});
