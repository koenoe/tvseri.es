import type { PreferredImages } from '@tvseri.es/schemas';

import { type AuthContext, apiFetch } from './client';

export async function updatePreferredImages({
  id,
  preferredImages,
  accessToken,
}: Readonly<{
  id: number;
  preferredImages: PreferredImages;
}> &
  AuthContext) {
  await apiFetch('/admin/preferred-images/series/:id', {
    auth: {
      token: accessToken,
      type: 'Bearer',
    },
    body: JSON.stringify(preferredImages),
    method: 'PUT',
    params: {
      id,
    },
  });
}
