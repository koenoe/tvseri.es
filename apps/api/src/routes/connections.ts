import { vValidator } from '@hono/valibot-validator';
import {
  ConnectionLinkCheckRequestSchema,
  ConnectionLinkRequestSchema,
} from '@tvseri.es/schemas';
import { sleep } from '@tvseri.es/utils';
import type { Context } from 'hono';
import { Hono } from 'hono';
import * as v from 'valibot';

import { encryptSecret } from '@/lib/connections/crypto';
import { asBrowser, readFailure } from '@/lib/connections/http';
import { READERS } from '@/lib/connections/readers';
import { saveConnection } from '@/lib/db/connections';
import { reserveLinkAttempt } from '@/lib/db/connections/linkAttempts';
import { consumeLinkCode, peekLinkCode } from '@/lib/db/connections/linkCode';
import { findUser } from '@/lib/db/user';
import type { Variables } from '@/middleware/auth';
import { SERVICE_PARAM, serviceParam } from '@/routes/serviceParam';

/** Within the API's 15s, with room to store the result */
const LINK_READ_BUDGET_MS = 11_000;

/**
 * The extension posts a service session with a link code, through the web's
 * forward (which holds the API key). One real read through the service's
 * reader proves the session before anything is stored.
 */
const app = new Hono<{ Variables: Variables }>();

/** The first `x-forwarded-for` hop: this API can't see the client behind the web */
const forwarded = <T extends v.ObjectEntries>(entries: T) =>
  v.object({
    ...entries,
    address: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(64))),
  });

const LinkForwardSchema = forwarded(ConnectionLinkRequestSchema.entries);
const CheckForwardSchema = forwarded(ConnectionLinkCheckRequestSchema.entries);

type CodeOwner =
  | Readonly<{ ok: true; userId: string }>
  | Readonly<{ ok: false; reason: 'bad-code' | 'rate-limited' }>;

/**
 * The one path for link and check. Unknown, expired, used and another
 * service's codes look alike: nothing to probe.
 */
const ownerOf = async (
  address: string | null,
  find: () => Promise<string | null>,
): Promise<CodeOwner> => {
  const attempt = await reserveLinkAttempt(address);
  if (!attempt) {
    return { ok: false, reason: 'rate-limited' };
  }
  const userId = await find();
  if (!userId) {
    return { ok: false, reason: 'bad-code' };
  }
  // A right code never counts, even if the link's test read fails later
  await attempt.release();
  return { ok: true, userId };
};

const refuseCode = (
  c: Context,
  reason: Extract<CodeOwner, Readonly<{ ok: false }>>['reason'],
) =>
  reason === 'rate-limited'
    ? c.json({ ok: false, reason } as const, 429)
    : c.json({ ok: false, reason } as const, 404);

app.post(
  `/${SERVICE_PARAM}/link/check`,
  serviceParam,
  vValidator('json', CheckForwardSchema),
  async (c) => {
    const { service } = c.req.valid('param');
    const { address = null, code } = c.req.valid('json');
    const owner = await ownerOf(address, () => peekLinkCode(code, service));
    if (!owner.ok) {
      return refuseCode(c, owner.reason);
    }
    const user = await findUser({ userId: owner.userId });
    // A code outliving its account (deleted meanwhile) links to no one
    if (!user) {
      return c.json({ ok: false, reason: 'bad-code' } as const, 404);
    }
    return c.json({ ok: true, username: user.username } as const);
  },
);

app.post(
  `/${SERVICE_PARAM}/link`,
  serviceParam,
  vValidator('json', LinkForwardSchema),
  async (c) => {
    const { service } = c.req.valid('param');
    const {
      address = null,
      code,
      cookies,
      userAgent = null,
    } = c.req.valid('json');
    const owner = await ownerOf(address, () => consumeLinkCode(code, service));
    if (!owner.ok) {
      return refuseCode(c, owner.reason);
    }
    const { userId } = owner;

    // Past its budget the test read answers as failed, so the 15s function
    // timeout never cuts the answer off
    const read = await Promise.race([
      asBrowser(userAgent, () => READERS[service].link(cookies)),
      sleep(LINK_READ_BUDGET_MS).then(() => readFailure('unavailable')),
    ]);
    if (!read.ok) {
      return c.json(
        {
          ok: false,
          reason:
            read.reason === 'signed-out' ? 'signed-out' : 'test-read-failed',
        } as const,
        422,
      );
    }

    const secret = await encryptSecret(userId, service, read.secret);
    await saveConnection({
      createdAt: Date.now(),
      lastSyncedAt: null,
      latestEpisodeTitle: read.latest?.episodeTitle ?? null,
      latestTitle: read.latest?.title ?? null,
      latestWatchedAt: read.latest?.watchedAt ?? null,
      profileId: read.profileId,
      profileName: read.profileName,
      secret,
      service,
      status: 'ok',
      total: read.total,
      userAgent,
      userId,
      via: 'extension',
    });
    return c.json({ ok: true, profile: read.profileName } as const, 201);
  },
);

export default app;
