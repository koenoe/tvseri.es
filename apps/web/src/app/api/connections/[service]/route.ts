import {
  ConnectionServiceSchema,
  ConnectionStatusSchema,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

import { apiFetch } from '@/lib/api/client';

import { ownPagesRoute, privateJson } from '../../handlers';

type Context = Readonly<{ params: Promise<{ service: string }> }>;

/** A service card's status, polled while the extension pairs; never cached */
export const GET = ownPagesRoute(async (viewer, _req, { params }: Context) => {
  const { service } = await params;
  if (!v.is(ConnectionServiceSchema, service)) {
    return privateJson({ error: 'Not found' }, 404);
  }
  const status = await apiFetch('/me/connections/:service', {
    accessToken: viewer.accessToken,
    params: { service },
    schema: ConnectionStatusSchema,
  });
  return privateJson(status);
});
