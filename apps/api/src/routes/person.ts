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
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1w, allow stale for 24h

  return c.json(person);
});

app.get('/:id/credits', async (c) => {
  const credits = await fetchPersonTvCredits(c.req.param('id'));

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1w, allow stale for 24h

  return c.json(
    credits ?? {
      cast: { previous: [], upcoming: [] },
      crew: { previous: [], upcoming: [] },
    },
  );
});

app.get('/:id/known-for', async (c) => {
  const person = await fetchPerson(c.req.param('id'));

  if (!person) {
    return c.notFound();
  }

  const items = await fetchPersonKnownFor(person);

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1w, allow stale for 24h

  return c.json(items);
});

export default app;
