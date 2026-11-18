import { isUnavailable } from '@/lib/cache/unavailable';
import { loadAdminImages } from '@/lib/series/adminImages';

import { adminRoute, isTmdbId, privateJson } from '../../../../handlers';

type Context = Readonly<{ params: Promise<{ id: string }> }>;

/**
 * The admin image tray's choices for a show (`SeriesImages`), read when the
 * tray opens. Admins only, never stored: the tray shows what is saved now.
 * A GET, not a server action: Next runs a tab's actions one at a time, so
 * this read would hold up the tray's Save.
 */
export const GET = adminRoute(async (_viewer, _req, { params }: Context) => {
  const { id } = await params;
  if (!isTmdbId(id)) {
    return privateJson({ error: 'Not found' }, 404);
  }
  const seriesId = Number(id);
  try {
    const images = await loadAdminImages(seriesId);
    if (isUnavailable(images)) {
      return privateJson({ error: 'Unavailable' }, 502);
    }
    return images
      ? Response.json(images)
      : privateJson({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('[admin] [images] load failed', { error, seriesId });
    return privateJson({ error: 'Failed' }, 502);
  }
});
