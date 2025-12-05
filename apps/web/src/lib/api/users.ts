import type { User } from '@tvseri.es/schemas';

import { apiFetch } from './client';

export async function findUser({ username }: Pick<User, 'username'>) {
  return (await apiFetch('/user/by-username/:username', {
    params: {
      username,
    },
  })) as User | undefined;
}
