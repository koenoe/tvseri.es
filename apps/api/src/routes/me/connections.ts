import { randomUUID } from 'node:crypto';
import { vValidator } from '@hono/valibot-validator';
import {
  ConnectionDismissAllQuerySchema,
  ConnectionDismissRequestSchema,
  ConnectionResolveRequestSchema,
  type ConnectionStatus,
  ConnectionSyncRequestSchema,
  ConnectionSyncRunSchema,
  canSyncNow,
  LinkCodeRequestSchema,
  syncTagPrefix,
  UnresolvedKeySchema,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';
import * as v from 'valibot';

import { READERS } from '@/lib/connections/readers';
import { queueSync } from '@/lib/connections/request';
import { syncTag } from '@/lib/connections/sync';
import { deleteConnection, getConnection } from '@/lib/db/connections';
import { mintLinkCode, revokeLinkCode } from '@/lib/db/connections/linkCode';
import { isSyncStalled } from '@/lib/db/connections/sync';
import {
  closeUnresolved,
  countUnresolved,
  dismissAllUnresolved,
  listUnresolved,
} from '@/lib/db/connections/unresolved';
import { getMarksByProvider } from '@/lib/db/watched';
import { writeWatchedBatch } from '@/lib/imports/write';
import { requireAuth, type Variables } from '@/middleware/auth';
import { SERVICE_PARAM, serviceParam } from '@/routes/serviceParam';

/** Every service has the same routes under `/:service` */
const app = new Hono<{ Variables: Variables }>();

app.use(requireAuth());

app.post('/link-code', vValidator('json', LinkCodeRequestSchema), async (c) => {
  const { user } = c.get('auth')!;
  const { service } = c.req.valid('json');
  return c.json(await mintLinkCode(user.id, service), 201);
});

app.delete('/link-code', async (c) => {
  const { user } = c.get('auth')!;
  await revokeLinkCode(user.id);
  return c.body(null, 204);
});

const SERVICE = `/${SERVICE_PARAM}`;

const NOT_CONNECTED: ConnectionStatus = {
  connected: false,
  lastSyncedAt: null,
  latest: null,
  profileName: null,
  recent: [],
  resumeFrom: null,
  status: null,
  sync: null,
  total: null,
  unresolvedCount: 0,
  week: [],
};

// DynamoDB only, so it sits on the write function and reflects a link the
// moment it lands
app.get(SERVICE, serviceParam, async (c) => {
  const { user } = c.get('auth')!;
  const { service } = c.req.valid('param');
  const connection = await getConnection(user.id, service);
  if (!connection) {
    return c.json(NOT_CONNECTED);
  }
  const [marks, unresolvedCount] = await Promise.all([
    getMarksByProvider({
      importIdPrefix: syncTagPrefix(service),
      providerName: READERS[service].watchProvider.name,
      userId: user.id,
    }),
    countUnresolved(user.id, service),
  ]);
  return c.json({
    connected: true,
    lastSyncedAt: connection.lastSyncedAt,
    latest:
      connection.latestTitle && connection.latestWatchedAt !== null
        ? {
            episodeTitle: connection.latestEpisodeTitle,
            title: connection.latestTitle,
            watchedAt: connection.latestWatchedAt,
          }
        : null,
    profileName: connection.profileName,
    recent: [...marks.recent],
    resumeFrom:
      connection.lastSyncedAt === null && !connection.sync
        ? (connection.syncedThrough ?? null)
        : null,
    status: connection.status,
    // `stalled` is the claim's own test, so the card offers Sync now exactly
    // when the claim would take it
    sync: connection.sync
      ? {
          ...v.parse(ConnectionSyncRunSchema, connection.sync),
          stalled: isSyncStalled(connection.sync),
        }
      : null,
    total: connection.total,
    unresolvedCount,
    week: [...marks.week],
  } satisfies ConnectionStatus);
});

// Syncs run nightly; a viewer may sync now only until the first has
// finished (to see the connection work), admins any time
app.post(`${SERVICE}/sync`, serviceParam, async (c) => {
  const { user } = c.get('auth')!;
  const { service } = c.req.valid('param');
  // Consistent: the claim holds only while the stored run is the one read
  const connection = await getConnection(user.id, service, true);
  if (!connection) {
    return c.json(
      { message: `${READERS[service].watchProvider.name} is not connected` },
      404,
    );
  }
  if (!canSyncNow(user.role, connection.lastSyncedAt)) {
    return c.json({ message: 'Syncs run every night' }, 403);
  }
  // Optional: the button before this one sent none, and an admin's sends none
  const text = await c.req.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400);
  }
  const request =
    body === null ? null : v.safeParse(ConnectionSyncRequestSchema, body);
  if (
    request &&
    (!request.success ||
      (request.output.since !== null && request.output.since > Date.now()))
  ) {
    return c.json({ message: 'Invalid sync request' }, 400);
  }
  // "How far back" is the first sync's alone: never a resumed run's
  const scope =
    request?.success && connection.lastSyncedAt === null && !connection.sync
      ? request.output
      : undefined;
  if ((await queueSync(user.id, service, connection, { scope })) === 'busy') {
    return c.json({ message: 'A sync is already running' }, 409);
  }
  return c.json({ state: 'queued' } as const, 202);
});

const UnresolvedQuerySchema = v.object({
  cursor: v.optional(UnresolvedKeySchema),
});

app.get(
  `${SERVICE}/unresolved`,
  serviceParam,
  vValidator('query', UnresolvedQuerySchema),
  async (c) => {
    const { user } = c.get('auth')!;
    const { cursor } = c.req.valid('query');
    return c.json(
      await listUnresolved(
        user.id,
        c.req.valid('param').service,
        cursor ?? null,
      ),
    );
  },
);

app.post(
  `${SERVICE}/unresolved/resolve`,
  serviceParam,
  vValidator('json', ConnectionResolveRequestSchema),
  async (c) => {
    const { user } = c.get('auth')!;
    const { service } = c.req.valid('param');
    const { items, keys } = c.req.valid('json');
    const result = await writeWatchedBatch(
      user.id,
      // A tag of its own: the card's activity shows the picks with the sync's
      syncTag(service, randomUUID()),
      items,
      { watchProvider: READERS[service].watchProvider },
    );
    const closed = await closeUnresolved(user.id, service, keys, 'resolvedAt');
    return c.json({ ...result, closed });
  },
);

app.post(
  `${SERVICE}/unresolved/dismiss-all`,
  serviceParam,
  vValidator('query', ConnectionDismissAllQuerySchema),
  async (c) => {
    const { user } = c.get('auth')!;
    const { group } = c.req.valid('query');
    const closed = await dismissAllUnresolved(
      user.id,
      c.req.valid('param').service,
      group,
    );
    return c.json({ closed });
  },
);

app.post(
  `${SERVICE}/unresolved/dismiss`,
  serviceParam,
  vValidator('json', ConnectionDismissRequestSchema),
  async (c) => {
    const { user } = c.get('auth')!;
    const { keys } = c.req.valid('json');
    const closed = await closeUnresolved(
      user.id,
      c.req.valid('param').service,
      keys,
      'dismissedAt',
    );
    return c.json({ closed });
  },
);

app.delete(SERVICE, serviceParam, async (c) => {
  const { user } = c.get('auth')!;
  await deleteConnection(user.id, c.req.valid('param').service);
  return c.body(null, 204);
});

export default app;
