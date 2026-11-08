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
