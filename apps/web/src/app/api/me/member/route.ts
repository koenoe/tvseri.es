import { MemberHandleSchema, MemberMatchSchema } from '@tvseri.es/schemas';
import * as v from 'valibot';

import { apiFetch } from '@/lib/api/client';

import { privateJson, viewerRoute } from '../../handlers';

/**
 * The search overlay's member lookup: `{ member }` for someone's exact
 * handle (`@juno` or `juno`), `null` when nobody has it. Signed in only (the
 * proxy answers 401 signed out); the overlay asks only for a signed-in
 * viewer's `@handle` query (`createSearchClient`).
 */
export const GET = viewerRoute(async (viewer, req) => {
  const handle = v.safeParse(
    MemberHandleSchema,
    req.nextUrl.searchParams.get('handle') ?? '',
  );
  if (!handle.success) {
    return privateJson({ error: 'InvalidHandle' }, 400);
  }
  const member = await apiFetch('/me/member', {
    accessToken: viewer.accessToken,
    notFound: 'null',
    query: { username: handle.output },
    schema: MemberMatchSchema,
  });
  return Response.json({ member });
});
