import { vValidator } from '@hono/valibot-validator';
import {
  SCROBBLE_PROVIDERS,
  type ScrobbleProvider,
} from '@tvseri.es/constants';
import {
  type RecentScrobble,
  UpdateWebhookSettingsSchema,
  type WebhookStatus,
  type WebhookToken,
} from '@tvseri.es/schemas';
import { type Context, Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { getMarksByProvider } from '@/lib/db/watched';
import {
  deleteWebhookToken,
  ensureEdgeKey,
  findWebhookTokenByUserAndType,
  generateWebhookToken,
  updateWebhookSettings,
} from '@/lib/db/webhooks';
import { requireAuth, type Variables } from '@/middleware/auth';

const app = new Hono<{ Variables: Variables }>();

const TYPE_PATH = `/type/:type{${SCROBBLE_PROVIDERS.join('|')}}`;

// The path pattern only matches a provider, but Hono can't infer that from a
// built string
const providerParam = (c: Context) => c.req.param('type') as ScrobbleProvider;

/** The user's token for a provider, or `{ token: null }` when they have none */
app.get(TYPE_PATH, requireAuth(), async (c) => {
  const { user } = c.get('auth')!;
  const webhookToken = await findWebhookTokenByUserAndType({
    type: providerParam(c),
    userId: user.id,
  });

  return c.json({
    token: webhookToken?.token ?? null,
  });
});

/** Generates the user's token for a provider; an existing one is revoked */
app.post(TYPE_PATH, requireAuth(), async (c) => {
  const { user } = c.get('auth')!;
  const webhookToken = await generateWebhookToken({
    type: providerParam(c),
    userId: user.id,
  });

  return c.json({ token: webhookToken.token }, 201);
});

/** Plex marks carry this watch provider name (lambdas/scrobble.ts) */
const PROVIDER_NAMES: Record<ScrobbleProvider, string> = { plex: 'Plex' };

const RECENT_LIMIT = 5;

/**
 * The week's marks reach back 8 days: the viewer's "last seven days ending
 * today" starts at most 7 days and a DST hour before now in any time zone,
 * and only the browser knows which zone that is.
 */
const WEEK_MS = 8 * 24 * 60 * 60 * 1000;

const toScrobble = ({
  episodeNumber,
  episodeTitle,
  seasonNumber,
  seriesId,
  title,
  watchedAt,
}: RecentScrobble): RecentScrobble => ({
  episodeNumber,
  ...(episodeTitle && { episodeTitle }),
  seasonNumber,
  seriesId,
  title,
  watchedAt,
});

const toStatus = async (
  webhookToken: WebhookToken,
  provider: ScrobbleProvider,
): Promise<WebhookStatus> => {
  const [urlWorks, marks] = await Promise.all([
    // A token from before the edge check gets its key here (once)
    ensureEdgeKey(webhookToken),
    getMarksByProvider({
      providerName: PROVIDER_NAMES[provider],
      recentLimit: RECENT_LIMIT,
      since: Date.now() - WEEK_MS,
      userId: webhookToken.userId,
    }),
  ]);

  return {
    connected: true,
    createdAt: webhookToken.createdAt,
    lastAccount: webhookToken.lastAccount ?? null,
    lastReceivedAt: webhookToken.lastReceivedAt ?? null,
    onlyAccount: webhookToken.onlyAccount ?? null,
    paused: webhookToken.paused === true,
    recent: marks.recent.map(toScrobble),
    urlWorks,
    week: marks.week.map(toScrobble),
  };
};

/** Connected or not, last scrobble, recent marks, pause, whose plays count */
app.get(`${TYPE_PATH}/status`, requireAuth(), async (c) => {
  const { user } = c.get('auth')!;
  const provider = providerParam(c);
  const webhookToken = await findWebhookTokenByUserAndType({
    type: provider,
    userId: user.id,
  });

  return c.json(
    webhookToken
      ? await toStatus(webhookToken, provider)
      : ({ connected: false } satisfies WebhookStatus),
  );
});

app.patch(
  TYPE_PATH,
  requireAuth(),
  vValidator('json', UpdateWebhookSettingsSchema),
  async (c) => {
    const { user } = c.get('auth')!;
    const provider = providerParam(c);
    const updated = await updateWebhookSettings({
      ...c.req.valid('json'),
      type: provider,
      userId: user.id,
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message === 'UnknownAccount') {
        throw new HTTPException(400, {
          message: 'Only the account of the last scrobble can be chosen',
        });
      }
      throw error;
    });

    if (!updated) {
      return c.json({ message: 'Not connected', status: 404 }, 404);
    }

    return c.json(await toStatus(updated, provider));
  },
);

/** Disconnect: the URL stops working; what's marked stays */
app.delete(TYPE_PATH, requireAuth(), async (c) => {
  const { user } = c.get('auth')!;
  await deleteWebhookToken({ type: providerParam(c), userId: user.id });
  return c.json({ message: 'OK' });
});

export default app;
