import { LinkCodeRequestSchema, LinkCodeSchema } from '@tvseri.es/schemas';
import * as v from 'valibot';

import { apiFetch } from '@/lib/api/client';

import { ownPagesRoute, privateJson } from '../../handlers';

/** Mints the card's link code; the API sets its lifetime and binding */
export const POST = ownPagesRoute(async (viewer, req) => {
  const body: unknown = await req.json().catch(() => null);
  if (!v.is(LinkCodeRequestSchema, body)) {
    return privateJson({ error: 'Bad request' }, 400);
  }
  const code = await apiFetch('/me/connections/link-code', {
    accessToken: viewer.accessToken,
    body: { service: body.service },
    method: 'POST',
    schema: LinkCodeSchema,
  });
  return privateJson(code);
});

/** Cancel: a code read off the screen stops working the moment the viewer gives up */
export const DELETE = ownPagesRoute(async (viewer) => {
  await apiFetch('/me/connections/link-code', {
    accessToken: viewer.accessToken,
    method: 'DELETE',
  });
  return new Response(null, { status: 204 });
});
