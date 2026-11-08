import {
  SCROBBLE_PROVIDERS,
  type ScrobbleProvider,
} from '@tvseri.es/constants';
import { type Context, Hono } from 'hono';

import {
  findWebhookToken,
  findWebhookTokenByUserAndType,
  generateWebhookToken,
} from '@/lib/db/webhooks';
import { requireAuth, type Variables } from '@/middleware/auth';

const app = new Hono<{ Variables: Variables }>();

const TYPE_PATH = `/type/:type{${SCROBBLE_PROVIDERS.join('|')}}`;

// The path pattern only matches a provider, but Hono can't infer that from a
// built string
const providerParam = (c: Context) => c.req.param('type') as ScrobbleProvider;

app.get('/token/:token', async (c) => {
  const token = await findWebhookToken(c.req.param('token'));
  return c.json(token);
});

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

export default app;
