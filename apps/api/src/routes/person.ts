import { Hono } from 'hono';

import {
  fetchPerson,
  fetchPersonKnownFor,
  fetchPersonTvCredits,
} from '@/lib/tmdb';

const app = new Hono();

app.get('/:id', async (c) => {
  const person = await fetchPerson(c.req.param('id'));

  if (!person) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(person);
});

app.get('/:id/credits', async (c) => {
  const credits = await fetchPersonTvCredits(c.req.param('id'));

  if (!credits) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(credits);
});

app.get('/:id/known-for', async (c) => {
  const person = await fetchPerson(c.req.param('id'));

  if (!person) {
    return c.notFound();
  }

  const items = await fetchPersonKnownFor(person);

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(items);
});

export default app;
