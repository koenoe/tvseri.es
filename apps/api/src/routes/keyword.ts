import { vValidator } from '@hono/valibot-validator';
import { Hono } from 'hono';
import { fetchKeyword } from '@/lib/tmdb';
import { cachedNotFound } from '@/middleware/cacheControl';
import { cacheHeader } from '@/utils/cacheHeader';
import { IdParamSchema } from '@/utils/params';

const app = new Hono();

app.get('/:id{[0-9]+}', vValidator('param', IdParamSchema), async (c) => {
  const keyword = await fetchKeyword(c.req.valid('param').id);

  c.header('Cache-Control', cacheHeader('medium'));

  if (!keyword) {
    return c.notFound();
  }

  return c.json(keyword);
});

// Non-matching paths (e.g. non-numeric ids): cacheable 404, like the real route
app.get('*', cachedNotFound('medium'));

export default app;
