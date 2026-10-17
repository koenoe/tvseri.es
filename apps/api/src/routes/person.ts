import { Hono } from 'hono';
import {
  fetchPerson,
  fetchPersonKnownFor,
  fetchPersonTvCredits,
} from '@/lib/tmdb';
import { cachedNotFound } from '@/middleware/cacheControl';
import { cacheHeader } from '@/utils/cacheHeader';

const app = new Hono();

app.get('/:id{[0-9]+}', async (c) => {
  const person = await fetchPerson(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('medium'));

  if (!person) {
    return c.notFound();
  }

  return c.json(person);
});

app.get('/:id{[0-9]+}/credits', async (c) => {
  const credits = await fetchPersonTvCredits(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('medium'));

  return c.json(
    credits ?? {
      cast: { previous: [], upcoming: [] },
      crew: { previous: [], upcoming: [] },
    },
  );
});

app.get('/:id{[0-9]+}/known-for', async (c) => {
  const person = await fetchPerson(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('medium'));

  if (!person) {
    return c.notFound();
  }

  const items = await fetchPersonKnownFor(person);

  return c.json(items);
});

// Non-matching paths (e.g. non-numeric ids): cacheable 404, like the real route
app.get('*', cachedNotFound('medium'));

export default app;
