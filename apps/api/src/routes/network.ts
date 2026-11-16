import { Hono } from 'hono';
import { fetchNetwork } from '@/lib/tmdb';
import { cachedNotFound } from '@/middleware/cacheControl';
import { cacheHeader } from '@/utils/cacheHeader';

const app = new Hono();

app.get('/:id{[0-9]{1,10}}', async (c) => {
  const network = await fetchNetwork(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('long'));

  if (!network) {
    return c.notFound();
  }

  return c.json(network);
});

// Non-matching paths (e.g. a slug instead of an id): cacheable 404
app.get('*', cachedNotFound('long'));

export default app;
