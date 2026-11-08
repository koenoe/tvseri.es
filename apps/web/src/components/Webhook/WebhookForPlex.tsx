import { cva } from 'class-variance-authority';

import { fetchWebhookToken } from '@/lib/api';

import Webhook from './Webhook';
import webhookUrlPrefix from './webhookUrlPrefix';

export const plexStyles = cva('bg-gradient-to-br from-[#e5a00d] to-[#b17a0a]');

const className = plexStyles();
const urlPrefix = webhookUrlPrefix('plex');

export default async function WebhookForPlex({
  accessToken,
}: Readonly<{
  accessToken: string;
}>) {
  const token = await fetchWebhookToken({
    accessToken,
    type: 'plex',
  });

  return (
    <Webhook
      className={className}
      initialToken={token}
      placeholder="Generate a webhook URL to start scrobbling from Plex"
      type="plex"
      urlPrefix={urlPrefix}
    />
  );
}
