import { cva } from 'class-variance-authority';

import {
  createWebhookToken,
  findWebhookTokenByUserAndType,
} from '@/lib/db/webhooks';

import generateWebhookUrl from './generateWebhookUrl';
import Webhook from './Webhook';

export const plexStyles = cva('bg-gradient-to-br from-[#e5a00d] to-[#b17a0a]');

export default async function WebhookForPlex({
  userId,
}: Readonly<{
  userId: string;
}>) {
  const payload = { userId, type: 'plex' };

  let webhookToken = await findWebhookTokenByUserAndType(payload);
  if (!webhookToken) {
    webhookToken = await createWebhookToken(payload);
  }

  return (
    <Webhook
      className={plexStyles()}
      url={generateWebhookUrl({
        token: webhookToken.token,
        type: 'plex',
      })}
    />
  );
}
