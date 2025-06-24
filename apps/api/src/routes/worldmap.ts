import { betterFetch } from '@better-fetch/fetch';
import { type WorldmapData } from '@tvseri.es/types';
import { Hono } from 'hono';

const app = new Hono();

app.get('/', async (c) => {
  const { data } = await betterFetch<WorldmapData>(
    'https://gist.githubusercontent.com/koenoe/929074f4776bc8b3144a13076e3c158c/raw/d937831559314e40b43ec0add531177cbb9a5cb1/gistfile1.txt',
  );

  c.header(
    'Cache-Control',
    'public, immutable, max-age=31536000, s-maxage=31536000',
  ); // 1 year, immutable

  return c.json(data);
});

export default app;
