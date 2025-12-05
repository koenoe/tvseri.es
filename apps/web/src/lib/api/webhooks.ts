import type { WebhookToken } from '@tvseri.es/schemas';

import { type AuthContext, apiFetch } from './client';

export async function fetchTokenForWebhookByType(
  input: Readonly<{
    type: 'plex' | 'jellyfin';
  }> &
    AuthContext,
) {
  const token = (await apiFetch('/webhook/type/:type', {
    auth: {
      token: input.accessToken,
      type: 'Bearer',
    },
    params: {
      type: input.type,
    },
  })) as Readonly<{
    token: string;
  }>;

  return token.token;
}

export async function fetchTokenForWebhook(
  input: Readonly<{
    token: string;
  }>,
) {
  const token = (await apiFetch('/webhook/token/:token', {
    params: {
      token: input.token,
    },
  })) as WebhookToken;

  return token;
}
