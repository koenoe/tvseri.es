import { vValidator } from '@hono/valibot-validator';
import { type LedgerDetail, toEpisodeCode } from '@tvseri.es/schemas';
import { Hono } from 'hono';

import { getSeriesPrefs } from '@/lib/db/prefs';
import { getLedger, getShowHoles } from '@/lib/ledger';
import { readShowItems } from '@/lib/rollups';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { fetchTvSeriesSeason, TMDB_CONCURRENCY } from '@/lib/tmdb';
import type { Variables } from '@/middleware/auth';
import { mapSettled } from '@/utils/limit';
import { SeriesIdParamSchema } from '@/utils/params';

/** `/me/ledger`: holes in the viewer's record */
const app = new Hono<{ Variables: Variables }>();

app.get('/', async (c) => {
  const { user } = c.get('auth')!;
  return c.json(await getLedger(user.id, Date.now()));
});

// One show, the missing episodes named with their air dates
app.get('/:id', vValidator('param', SeriesIdParamSchema), async (c) => {
  const { user } = c.get('auth')!;
  const { id } = c.req.valid('param');

  // Independent reads, together
  const [allFacts, prefs, watched] = await Promise.all([
    getSeriesFacts([id]),
    getSeriesPrefs(user.id, id),
    readShowItems(user.id, [id]),
  ]);
  const facts = allFacts.get(id);
  if (!facts) {
    return c.notFound();
  }

  const holes = getShowHoles(
    watched.get(id) ?? [],
    facts,
    new Set(prefs.skipped),
    Date.now(),
  );

  const seasons = [...new Set(holes.map((hole) => hole.season))];
  const details = new Map(
    await mapSettled(
      seasons,
      async (season) => {
        const detail = await fetchTvSeriesSeason(id, season);
        return detail && ([season, detail] as const);
      },
      TMDB_CONCURRENCY,
    ),
  );

  return c.json({
    episodes: holes.map((hole) => {
      const episode = details
        .get(hole.season)
        ?.episodes.find(
          (candidate) => candidate.episodeNumber === hole.episode,
        );
      return {
        airDate: episode?.airDate.slice(0, 10) ?? '',
        code: toEpisodeCode(hole.season, hole.episode),
        episode: hole.episode,
        season: hole.season,
        title: episode?.title ?? '',
      };
    }),
    seriesId: id,
  } satisfies LedgerDetail);
});

export default app;
