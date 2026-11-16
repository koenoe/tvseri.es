import { vValidator } from '@hono/valibot-validator';
import { Hono } from 'hono';
import * as v from 'valibot';
import detectDominantColorFromImage from '@/lib/detectDominantColorFromImage';
import { cacheHeader } from '@/utils/cacheHeader';

const FALLBACK_COLOR = '#000000';

// Only TMDB images: https://image.tmdb.org/t/p/{size}{path}
const TMDB_IMAGE_URL_REGEX =
  /^https:\/\/image\.tmdb\.org\/t\/p\/([^/]+)(\/[^/]+)$/;

const QuerySchema = v.object({
  url: v.pipe(v.string(), v.maxLength(300)),
});

const app = new Hono();

app.get('/', vValidator('query', QuerySchema), async (c) => {
  const { url } = c.req.valid('query');

  const match = TMDB_IMAGE_URL_REGEX.exec(url);
  const [, size, path] = match ?? [];
  if (!size || !path) {
    return c.json({ error: 'Only TMDB image URLs are supported' }, 400);
  }

  // `cache_key` is ignored: the cache key is derived from the URL path
  const dominantColor = await detectDominantColorFromImage({ path, size });

  // Don't pin the fallback at the CDN; retry detection on the next request
  c.header(
    'Cache-Control',
    dominantColor ? cacheHeader('immutable') : 'no-store',
  );

  return c.json({
    hex: dominantColor ?? FALLBACK_COLOR,
  });
});

export default app;
