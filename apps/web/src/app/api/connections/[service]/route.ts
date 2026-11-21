import {
  ConnectionServiceSchema,
  type ConnectionStatus,
  ConnectionStatusSchema,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

import { apiFetch } from '@/lib/api/client';
import { revalidateViewerStats } from '@/lib/stats/revalidateViewerStats';

import { ownPagesRoute, privateJson } from '../../handlers';

type Context = Readonly<{ params: Promise<{ service: string }> }>;

/**
 * How long after a sync ends its writes still refresh the viewer's stats:
 * the running sync's poll reads its end within 30 s, or as soon as a hidden
 * tab shows again; a pairing poll much later expires nothing.
 */
const SYNC_STATS_WINDOW_MS = 60 * 60 * 1000;

/** A sync that ended (done or failed part-way) lately, having written episodes */
const syncJustWrote = (sync: ConnectionStatus['sync'], now: number) =>
  sync !== null &&
  sync.written > 0 &&
  sync.finishedAt !== null &&
  now - sync.finishedAt < SYNC_STATS_WINDOW_MS;

/**
 * A service card's status, polled while the extension pairs and while a
 * sync runs; never cached. The sync's poll is the one place the site learns
 * a sync ended, so an answer with a sync that just wrote episodes refreshes
 * the viewer's stats, as the import status route does after an Undo.
 */
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
  if (syncJustWrote(status.sync, Date.now())) {
    revalidateViewerStats(viewer.id);
  }
  return privateJson(status);
});
