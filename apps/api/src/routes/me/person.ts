import { vValidator } from '@hono/valibot-validator';
import { Hono } from 'hono';

import { getLibraryIds } from '@/lib/db/list';
import { getWatchedCountForTvSeries } from '@/lib/db/watched';
import { fetchPersonShows } from '@/lib/person/load';
import { TMDB_CONCURRENCY } from '@/lib/tmdb';
import type { Variables } from '@/middleware/auth';
import { mapSettled } from '@/utils/limit';
import { PersonIdParamSchema } from '@/utils/params';

/** `/me/person/:id/...`: the signed-in user's view of one person */
const app = new Hono<{ Variables: Variables }>();

// "Watched 74 episodes, 3 of 67 shows"
app.get('/:id/watched', vValidator('param', PersonIdParamSchema), async (c) => {
  const { user } = c.get('auth')!;
  const { id } = c.req.valid('param');

  const [credits, library] = await Promise.all([
    fetchPersonShows(id),
    getLibraryIds(user.id),
  ]);
  const states = new Map<number, 'watched' | 'in-progress'>([
    ...library.inProgress.map((seriesId) => [seriesId, 'in-progress'] as const),
    ...library.watched.map((seriesId) => [seriesId, 'watched'] as const),
  ]);

  if (!credits) {
    return c.notFound();
  }

  const mine = [...credits.shows, ...credits.upcoming].filter((show) =>
    states.has(show.id),
  );
  const items = await mapSettled(
    mine,
    async (show) => {
      const watched = await getWatchedCountForTvSeries({
        tvSeriesId: show.id,
        userId: user.id,
      });
      return {
        episodeCount: show.episodeCount,
        episodesWatched: show.episodeCount
          ? Math.min(watched, show.episodeCount)
          : watched,
        seriesId: show.id,
        state: states.get(show.id) as 'watched' | 'in-progress',
      };
    },
    TMDB_CONCURRENCY,
  );
  const seen = items
    .filter((item) => item.episodesWatched > 0)
    .sort((a, b) => b.episodesWatched - a.episodesWatched);

  c.header('Cache-Control', 'private, no-store');

  return c.json({
    episodes: seen.reduce((sum, item) => sum + item.episodesWatched, 0),
    items: seen,
    shows: seen.length,
    totalShows: credits.counts.all,
  });
});

export default app;
