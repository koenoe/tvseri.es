import { BackdropColoursInputSchema } from '@tvseri.es/schemas';
import * as v from 'valibot';

import { loadBackdropColours } from '@/lib/series/adminImages';

import { adminRoute, isTmdbId, privateJson } from '../../../../handlers';

type Context = Readonly<{ params: Promise<{ id: string }> }>;

/**
 * The page colours of a few of a show's backdrops (`?path=/a.jpg&path=…`,
 * up to 8) for the admin image tray: `{ [path]: hex }` for the ones that
 * could be read, a 502 when none could. Admins only, never stored.
 */
export const GET = adminRoute(async (_viewer, req, { params }: Context) => {
  const { id } = await params;
  if (!isTmdbId(id)) {
    return privateJson({ error: 'Not found' }, 404);
  }
  const parsed = v.safeParse(BackdropColoursInputSchema, {
    paths: req.nextUrl.searchParams.getAll('path'),
    seriesId: Number(id),
  });
  if (!parsed.success) {
    return privateJson({ error: 'Invalid paths' }, 400);
  }
  const colours = await loadBackdropColours(parsed.output.paths);
  return Object.keys(colours).length > 0
    ? Response.json(colours)
    : privateJson({ error: 'Failed' }, 502);
});
