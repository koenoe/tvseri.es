import { vValidator } from '@hono/valibot-validator';
import { Hono } from 'hono';
import * as v from 'valibot';
import { getLibraryIds } from '@/lib/db/list';
import { becauseYouWatched, moreGenre } from '@/lib/home/picks';
import { spotlightLines } from '@/lib/home/spotlightLines';
import type { Variables } from '@/middleware/auth';
import { cacheHeader } from '@/utils/cacheHeader';
import { todayUtc } from '@/utils/time';

const DateQuerySchema = v.object({
  date: v.optional(v.pipe(v.string(), v.isoDate())),
});

const app = new Hono<{ Variables: Variables }>();

// Personal: only the viewer's browser may keep it (a day)
app.use(async (c, next) => {
  await next();
  c.header('Cache-Control', cacheHeader('metrics', { scope: 'private' }));
});

// "Because you watched <a favourite>"
app.get(
  '/because-you-watched',
  vValidator('query', DateQuerySchema),
  async (c) => {
    const { user } = c.get('auth')!;
    const date = c.req.valid('query').date ?? todayUtc();
    const ids = await getLibraryIds(user.id);

    const favourite = await becauseYouWatched(ids, date, {
      from: 'favorite',
      salt: 'because',
    });
    // No favourites yet: start from a finished show instead
    return c.json(
      favourite.source
        ? favourite
        : await becauseYouWatched(ids, date, {
            from: 'watched',
            salt: 'because',
          }),
    );
  },
);

// "If you liked <a show you finished>": a different pick than the row above
app.get('/if-you-liked', vValidator('query', DateQuerySchema), async (c) => {
  const { user } = c.get('auth')!;
  const date = c.req.valid('query').date ?? todayUtc();
  const ids = await getLibraryIds(user.id);

  return c.json(
    await becauseYouWatched(ids, date, { from: 'watched', salt: 'liked' }),
  );
});

// "More <genre>": the watchlist's most common genre
app.get('/more-genre', async (c) => {
  const { user } = c.get('auth')!;

  return c.json(await moreGenre(await getLibraryIds(user.id)));
});

// The signed-in line under each spotlight show: "Like Severance, which you favourited"
app.get('/spotlight-lines', async (c) => {
  const { user } = c.get('auth')!;

  return c.json(await spotlightLines(user.id, await getLibraryIds(user.id)));
});

export default app;
