import 'server-only';

import {
  type ConnectionService,
  type ConnectionUnresolvedPage,
  ConnectionUnresolvedPageSchema,
} from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

/**
 * The first page of the sync's review list; never cached. `null` when the
 * API didn't answer, so the card leaves the list out rather than fail.
 */
export async function loadConnectionUnresolved(
  accessToken: string,
  service: ConnectionService,
): Promise<ConnectionUnresolvedPage | null> {
  try {
    return await apiFetch('/me/connections/:service/unresolved', {
      accessToken,
      params: { service },
      schema: ConnectionUnresolvedPageSchema,
    });
  } catch {
    return null;
  }
}
