import { Hono } from 'hono';

import {
  createWebhookToken,
  findWebhookToken,
  findWebhookTokenByUserAndType,
} from '@/lib/db/webhooks';
import { requireAuth, type Variables } from '@/middleware/auth';

const app = new Hono<{ Variables: Variables }>();

app.get('/token/:token', async (c) => {
  const token = await findWebhookToken(c.req.param('token'));
  return c.json(token);
});

app.get('/type/:type{plex|jellyfin|emby}', requireAuth(), async (c) => {
  const { user } = c.get('auth')!;
  const payload = {
    type: c.req.param('type'),
    userId: user.id,
  };

  let webhookToken = await findWebhookTokenByUserAndType(payload);
  if (!webhookToken) {
    webhookToken = await createWebhookToken(payload);
  }

  return c.json({
    token: webhookToken.token,
  });
});

export default app;
