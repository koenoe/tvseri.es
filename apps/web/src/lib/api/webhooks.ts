import type { ScrobbleProvider } from '@tvseri.es/constants';

import { type AuthContext, apiFetch } from './client';

type WebhookTokenInput = Readonly<{ type: ScrobbleProvider }> & AuthContext;

/** The user's webhook token for a provider; null until they generate one */
export async function fetchWebhookToken(
  input: WebhookTokenInput,
): Promise<string | null> {
  const result = await apiFetch<Readonly<{ token: string | null }>>(
    '/webhook/type/:type',
    {
      accessToken: input.accessToken,
      params: {
        type: input.type,
      },
    },
  );

  return result.token;
}

/** Generates a new token for a provider; the previous one stops working */
export async function createWebhookToken(
  input: WebhookTokenInput,
): Promise<string> {
  const result = await apiFetch<Readonly<{ token: string }>>(
    '/webhook/type/:type',
    {
      accessToken: input.accessToken,
      method: 'POST',
      params: {
        type: input.type,
      },
    },
  );

  return result.token;
}
