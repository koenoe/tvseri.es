import { todayUtc } from '@tvseri.es/utils';
import { Hono } from 'hono';
import { fetchPremieresWithStatus } from '@/lib/home/premieres';
import { todayBuildCacheControl } from '@/utils/cacheHeader';

const app = new Hono();

// New shows and season premieres, next 60 days; the same for everyone
app.get('/', async (c) => {
  const now = Date.now();
  const { partial, premieres } = await fetchPremieresWithStatus(todayUtc(now));

  // The URL means today: kept until midnight UTC at most; an incomplete list
  // (some lookups failed) an hour, yesterday's standing in 30 s
  c.header('Cache-Control', todayBuildCacheControl(premieres, partial, now));
  return c.json(premieres);
});

export default app;
