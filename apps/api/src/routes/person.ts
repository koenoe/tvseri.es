import { Hono } from 'hono';
import {
  fetchPerson,
  fetchPersonKnownFor,
  fetchPersonTvCredits,
} from '@/lib/tmdb';
import { cache } from '@/middleware/cache';

const app = new Hono();

app.get('/:id', cache('medium'), async (c) => {
  const person = await fetchPerson(c.req.param('id'));

  if (!person) {
    return c.notFound();
  }

  return c.json(person);
});

app.get('/:id/credits', cache('medium'), async (c) => {
  const credits = await fetchPersonTvCredits(c.req.param('id'));

  return c.json(
    credits ?? {
      cast: { previous: [], upcoming: [] },
      crew: { previous: [], upcoming: [] },
    },
  );
});

app.get('/:id/known-for', cache('medium'), async (c) => {
  const person = await fetchPerson(c.req.param('id'));

  if (!person) {
    return c.notFound();
  }

  const items = await fetchPersonKnownFor(person);

  return c.json(items);
});

export default app;
