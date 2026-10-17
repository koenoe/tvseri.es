import type { User } from '@tvseri.es/schemas';

import { apiFetch } from './client';

// Not cached across requests (renames would need invalidation); identical
// lookups within one render are deduped by apiFetch.
export async function findUser({ username }: Pick<User, 'username'>) {
  return apiFetch<User>('/user/by-username/:username', {
    notFound: 'null',
    params: {
      username,
    },
  });
}
