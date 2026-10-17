import type { UpdateUser, User, WatchProvider } from '@tvseri.es/schemas';

import { type AuthContext, apiFetch } from './client';

export async function me({ accessToken }: AuthContext) {
  return apiFetch<User>('/me', {
    accessToken,
    notFound: 'null',
  });
}

export async function updateUser({
  accessToken,
  ...rest
}: UpdateUser & AuthContext) {
  return apiFetch<User>('/me', {
    accessToken,
    body: JSON.stringify(rest),
    method: 'PUT',
  });
}

export async function updateWatchProviders({
  accessToken,
  watchProviders,
}: Readonly<{
  watchProviders: WatchProvider[];
}> &
  AuthContext) {
  return apiFetch<User>('/me/watch-providers', {
    accessToken,
    body: JSON.stringify({ watchProviders }),
    method: 'PUT',
  });
}
