import { cva } from 'class-variance-authority';

import { fetchTokenForWebhookByType } from '@/lib/api';

import generateWebhookUrl from './generateWebhookUrl';
import Webhook from './Webhook';

export const plexStyles = cva('bg-gradient-to-br from-[#e5a00d] to-[#b17a0a]');

export default async function WebhookForPlex({
  encryptedSessionId,
}: Readonly<{
  encryptedSessionId: string;
}>) {
  const type = 'plex';
  const token = await fetchTokenForWebhookByType({
    sessionId: encryptedSessionId,
    type,
  });

  return (
    <Webhook
      className={plexStyles()}
      url={generateWebhookUrl({
        token,
        type,
      })}
    />
  );
}
