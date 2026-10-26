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
    accessToken,
    body: JSON.stringify(preferredImages),
    method: 'PUT',
    params: {
      id,
    },
  });
}

export async function deletePreferredImages({
  id,
  accessToken,
}: Readonly<{
  id: number;
}> &
  AuthContext) {
  await apiFetch('/admin/preferred-images/series/:id', {
    accessToken,
    method: 'DELETE',
    params: {
      id,
    },
  });
}
