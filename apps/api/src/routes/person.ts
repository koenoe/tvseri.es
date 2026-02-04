import { Hono } from 'hono';
import {
  fetchPerson,
  fetchPersonKnownFor,
  fetchPersonTvCredits,
} from '@/lib/tmdb';
import { cacheHeader } from '@/utils/cacheHeader';

const app = new Hono();

app.get('/:id', async (c) => {
  const person = await fetchPerson(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('medium'));

  if (!person) {
    return c.notFound();
  }

  return c.json(person);
});

app.get('/:id/credits', async (c) => {
  const credits = await fetchPersonTvCredits(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('medium'));

  return c.json(
    credits ?? {
      cast: { previous: [], upcoming: [] },
      crew: { previous: [], upcoming: [] },
    },
  );
});

app.get('/:id/known-for', async (c) => {
  const person = await fetchPerson(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('medium'));

  if (!person) {
    return c.notFound();
  }

  const items = await fetchPersonKnownFor(person);

  return c.json(items);
});

export default app;
