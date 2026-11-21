import { vValidator } from '@hono/valibot-validator';
import { UpdateSeriesPrefsSchema } from '@tvseri.es/schemas';
import { Hono } from 'hono';

import { getSeriesStatus } from '@/lib/db/list';
import { getSeriesPrefs, updateSeriesPrefs } from '@/lib/db/prefs';
import { syncListsForSkips } from '@/lib/listSync';
import { listedEpisodeCodes } from '@/lib/marking/listedEpisodes';
import type { SignedInVariables } from '@/middleware/auth';
import { IdParamSchema } from '@/utils/params';

/** `/me/series/:id/...`: the signed-in user's state for one show */
// Mounted under /me, behind its requireAuth()
const app = new Hono<{ Variables: SignedInVariables }>();

// List status (favourite, watchlist) and prefs in one read (show page)
app.get('/:id/status', vValidator('param', IdParamSchema), async (c) => {
  const { user } = c.get('auth');
  const { id } = c.req.valid('param');
  return c.json(await getSeriesStatus({ id, userId: user.id }));
});

app.get('/:id/prefs', vValidator('param', IdParamSchema), async (c) => {
  const { user } = c.get('auth');
  const { id } = c.req.valid('param');
  return c.json(await getSeriesPrefs(user.id, id));
});

app.patch(
  '/:id/prefs',
  vValidator('param', IdParamSchema),
  vValidator('json', UpdateSeriesPrefsSchema),
  async (c) => {
    const { user } = c.get('auth');
    const { id } = c.req.valid('param');
    const { skip: requested, ...rest } = c.req.valid('json');
    // Skips are checked against TMDB's episode lists like watched marks: an
    // episode it doesn't list is dropped. Unskips never are, so a stale
    // code can go.
    const skip = requested ? await listedEpisodeCodes(id, requested) : [];
    const update = { ...rest, ...(skip.length > 0 && { skip }) };
    if (Object.keys(update).length === 0) {
      return c.json(await getSeriesPrefs(user.id, id));
    }
    const prefs = await updateSeriesPrefs(user.id, id, update);
    // A skipped episode counts as done for Finished
    if (update.skip || update.unskip) {
      await syncListsForSkips(user.id, [id]);
    }
    return c.json(prefs);
  },
);

export default app;
