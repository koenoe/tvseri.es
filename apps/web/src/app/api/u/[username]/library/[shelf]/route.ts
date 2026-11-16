import { LibraryShelfSchema } from '@tvseri.es/schemas';
import * as v from 'valibot';

import { loadShelfPage } from '@/app/(site)/u/[username]/(profile)/library/_data/library';
import { parseShelfQuery } from '@/app/(site)/u/[username]/(profile)/library/_lib/shelfQuery';
import { ApiError } from '@/lib/api/client';

import { privateJson, viewerRoute } from '../../../../handlers';
import requireProfile from '../../../requireProfile';

type Context = Readonly<{
  params: Promise<{ shelf: string; username: string }>;
}>;

/**
 * A Library shelf's next (`?cursor=`) and previous (`?before=`) pages, with
 * the page's own query (sort, find, letter, filter): trimmed tile views,
 * private. A visitor asking for Hidden is a 404, like the page.
 */
export const GET = viewerRoute(async (signedIn, req, { params }: Context) => {
  const { shelf, username } = await params;
  const parsed = v.safeParse(LibraryShelfSchema, shelf);
  if (!parsed.success) {
    return privateJson({ error: 'No such shelf' }, 404);
  }
  const gate = await requireProfile(req, signedIn, username);
  if (gate instanceof Response) {
    return gate;
  }
  const search = req.nextUrl.searchParams;
  const viewer = signedIn.id === gate.userId ? 'owner' : 'visitor';
  if (parsed.output === 'hidden' && viewer === 'visitor') {
    return privateJson({ error: 'No such shelf' }, 404);
  }
  const query = parseShelfQuery(
    Object.fromEntries(search),
    parsed.output,
    viewer,
  );
  const cursor = search.get('cursor') ?? undefined;
  const before = search.get('before') ?? undefined;
  if (cursor && before) {
    return privateJson({ error: 'Send cursor or before, not both' }, 400);
  }
  try {
    const page = await loadShelfPage(gate, query, { before, cursor });
    return Response.json(page);
  } catch (error) {
    // the API's 4xx is the answer (a 403 as a 404); a 401 is the session's
    // (`viewerRoute` passes `AccountGone` through)
    if (
      error instanceof ApiError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 401
    ) {
      return privateJson(
        { error: 'Not available' },
        error.status === 403 ? 404 : error.status,
      );
    }
    throw error;
  }
});
