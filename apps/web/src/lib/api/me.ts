import type { UpdateUser, User, WatchProvider } from '@tvseri.es/schemas';

import { type AuthContext, apiFetch } from './client';

export async function me({ accessToken }: AuthContext) {
  const response = await apiFetch('/me', {
    auth: {
      token: accessToken,
      type: 'Bearer',
    },
  });

  if (!response) {
    return null;
  }

  const result = response as User;

  return result;
}

export async function updateUser({
  accessToken,
  ...rest
}: UpdateUser & AuthContext) {
  const user = (await apiFetch('/me', {
    auth: {
      token: accessToken,
      type: 'Bearer',
    },
    body: JSON.stringify(rest),
    method: 'PUT',
  })) as User;

  return user;
}

export async function updateWatchProviders({
  accessToken,
  watchProviders,
}: Readonly<{
  watchProviders: WatchProvider[];
}> &
  AuthContext) {
  const user = (await apiFetch('/me/watch-providers', {
    auth: {
      token: accessToken,
      type: 'Bearer',
    },
    body: JSON.stringify({ watchProviders }),
    method: 'PUT',
  })) as User;

  return user;
}
