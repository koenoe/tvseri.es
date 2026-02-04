import { Hono } from 'hono';
import detectDominantColorFromImage from '@/lib/detectDominantColorFromImage';
import { cacheHeader } from '@/utils/cacheHeader';

const app = new Hono();

app.get('/', async (c) => {
  const url = c.req.query('url');
  if (!url) {
    return c.json({ error: 'No url provided' }, 400);
  }

  const cacheKey = c.req.query('cache_key') ?? url;
  const dominantColor = await detectDominantColorFromImage({
    cacheKey,
    url,
  });

  c.header('Cache-Control', cacheHeader('immutable'));

  return c.json({
    hex: dominantColor,
  });
});

export default app;
