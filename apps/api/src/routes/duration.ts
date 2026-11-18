import { vValidator } from '@hono/valibot-validator';
import { landingFilter } from '@tvseri.es/constants';
import { DURATION_BUCKETS } from '@tvseri.es/schemas';
import { Hono } from 'hono';
import * as v from 'valibot';
import {
  fetchDurationPage,
  fetchDurationTiles,
  fetchFinishThisWeekend,
  fetchWhereToStart,
  type WhereToStartFilter,
} from '@/lib/duration';
import {
  drawnShows,
  drawnTiles,
  drawnWhereToStart,
} from '@/lib/duration/drawn';
import { cacheHeader, PARTIAL_CACHE_CONTROL } from '@/utils/cacheHeader';

/** A partial answer (a show TMDB failed on) stays out of the CDN for long */
const durationCacheControl = (partial: boolean) =>
  partial ? PARTIAL_CACHE_CONTROL : cacheHeader('medium');

const app = new Hono();

const BucketParamSchema = v.object({ bucket: v.picklist(DURATION_BUCKETS) });
const PageQuerySchema = v.object({
  page: v.optional(
    v.pipe(
      v.string(),
      v.regex(/^[1-9]\d{0,2}$/),
      v.transform(Number),
      v.maxValue(500),
    ),
    '1',
  ),
});
/**
 * A genre or theme landing's slug: only those have Where to start cards, and
 * anything else would build and cache a pool of its own.
 */
const landingSlugSchema = (type: 'genre' | 'theme') =>
  v.pipe(
    v.string(),
    v.regex(/^[a-z0-9-]{1,40}$/),
    v.check(
      (slug) => landingFilter(type, slug) !== undefined,
      `Expected a ${type} with a landing`,
    ),
  );
const CountryCodeSchema = v.pipe(
  v.string(),
  v.regex(/^[A-Za-z]{2}$/),
  v.transform((code) => code.toUpperCase()),
  v.check((code) => landingFilter('country', code) !== undefined),
);
// Exactly one of `genre`, `theme` (landing slugs) or `country` (ISO 3166-1 alpha-2)
const WhereToStartQuerySchema = v.pipe(
  v.object({
    country: v.optional(CountryCodeSchema),
    genre: v.optional(landingSlugSchema('genre')),
    theme: v.optional(landingSlugSchema('theme')),
  }),
  v.check(
    ({ country, genre, theme }) =>
      [country, genre, theme].filter((value) => value !== undefined).length ===
      1,
    'Expected exactly one of genre, theme or country',
  ),
  v.transform(({ country, genre, theme }): WhereToStartFilter => {
    if (country !== undefined) {
      return { country };
    }
    return genre !== undefined ? { genre } : { theme: theme ?? '' };
  }),
);

// The five Duration tiles with their counts
app.get('/', async (c) => {
  const { partial, value } = await fetchDurationTiles();
  c.header('Cache-Control', durationCacheControl(partial));
  return c.json(await drawnTiles(value));
});

// Finish it this weekend
app.get('/weekend', async (c) => {
  const { partial, value } = await fetchFinishThisWeekend();
  c.header('Cache-Control', durationCacheControl(partial));
  return c.json(await drawnShows(value));
});

// Where to start, per genre, theme or country
app.get(
  '/where-to-start',
  vValidator('query', WhereToStartQuerySchema),
  async (c) => {
    c.header('Cache-Control', cacheHeader('medium'));
    return c.json(
      await drawnWhereToStart(await fetchWhereToStart(c.req.valid('query'))),
    );
  },
);

// The shows in one tile
app.get(
  '/:bucket',
  vValidator('param', BucketParamSchema),
  vValidator('query', PageQuerySchema),
  async (c) => {
    const { partial, value } = await fetchDurationPage(
      c.req.valid('param').bucket,
      c.req.valid('query').page,
    );
    c.header('Cache-Control', durationCacheControl(partial));
    return c.json(await drawnShows(value));
  },
);

export default app;
