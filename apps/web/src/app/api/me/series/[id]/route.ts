import { readSeriesSeed } from '@/lib/marking/server/seed';
import { loadSeriesForWrite } from '@/lib/series/forWrite';

import { isTmdbId, privateJson, viewerRoute } from '../../../handlers';

type Context = Readonly<{ params: Promise<{ id: string }> }>;

/**
 * A show's marking state for the viewer (`SeriesSeed`): seasons, watched
 * episodes, lists and prefs. Seeds the store where a page didn't (the Remote
 * on a tile, `useEnsureSeries`). The proxy answers 401 signed out.
 */
export const GET = viewerRoute(async (viewer, _req, { params }: Context) => {
  const { id } = await params;
  if (!isTmdbId(id)) {
    return privateJson({ error: 'Not found' }, 404);
  }
  const seriesId = Number(id);
  const seed = await readSeriesSeed(
    viewer,
    seriesId,
    loadSeriesForWrite(seriesId),
  );
  return seed ? Response.json(seed) : privateJson({ error: 'Not found' }, 404);
});
