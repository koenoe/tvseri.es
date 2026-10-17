import type { WebhookToken } from '@tvseri.es/schemas';

import { type AuthContext, apiFetch } from './client';

export async function fetchTokenForWebhookByType(
  input: Readonly<{
    type: 'plex' | 'jellyfin';
  }> &
    AuthContext,
) {
  const token = await apiFetch<Readonly<{ token: string }>>(
    '/webhook/type/:type',
    {
      accessToken: input.accessToken,
      params: {
        type: input.type,
      },
    },
  );

  return token.token;
}

/** Returns null when the token doesn't exist. */
export async function fetchTokenForWebhook(
  input: Readonly<{
    token: string;
  }>,
) {
  return apiFetch<WebhookToken>('/webhook/token/:token', {
    notFound: 'null',
    params: {
      token: input.token,
    },
  });
}
