import { vValidator } from '@hono/valibot-validator';
import {
  CACHE_LIFE,
  LANDING_TYPES,
  WATCH_PROVIDER_PREDEFINED_COLOR,
} from '@tvseri.es/constants';
import {
  normalizeDiscoverQuery,
  parseDiscoverPage,
  type WatchProvider,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as v from 'valibot';
import { readThroughDay } from '@/lib/db/cache/readThroughDay';
import { detectDominantColorsFromImages } from '@/lib/detectDominantColorFromImage';
import { buildGoDeeper } from '@/lib/goDeeper';
import { getLandingCounts, getLandingFacts } from '@/lib/landingFacts';
import {
  fetchCountries,
  fetchDiscoverTvSeries,
  fetchLanguages,
  fetchWatchProviders,
} from '@/lib/tmdb';
import { cacheHeader, PARTIAL_CACHE_CONTROL } from '@/utils/cacheHeader';
import { DayQuerySchema } from '@/utils/dayParam';
import { WatchProvidersQuerySchema } from '@/utils/params';

const app = new Hono();

const enrichWatchProvidersWithColors = async (
  watchProviders: WatchProvider[],
) => {
  // Only providers without a predefined colour need a (cached) detection
  const detectedColors = await detectDominantColorsFromImages({
    paths: watchProviders.flatMap((provider) =>
      !WATCH_PROVIDER_PREDEFINED_COLOR[provider.name] && provider.logoPath
        ? [provider.logoPath]
        : [],
    ),
    size: 'w92',
  });

  return watchProviders.map((provider) => ({
    ...provider,
    color:
      WATCH_PROVIDER_PREDEFINED_COLOR[provider.name] ||
      (provider.logoPath ? detectedColors.get(provider.logoPath) : undefined) ||
      '#000000',
  }));
};

app.get('/', async (c) => {
  // `pageOrCursor` is the legacy name for `page` (older web deploys). Remove the
  // alias once every web deploy sends `page`.
  const page = parseDiscoverPage(
    c.req.query('page') ?? c.req.query('pageOrCursor'),
  );

  if (page === null) {
    throw new HTTPException(400, { message: 'Invalid page' });
  }

  // Only known, validated filters are forwarded to TMDB
  const { query } = normalizeDiscoverQuery(c.req.query());
  const result = await fetchDiscoverTvSeries({ ...query, page });

  c.header('Cache-Control', cacheHeader('medium'));

  return c.json(result);
});

const LandingTypeSchema = v.picklist(LANDING_TYPES);

/** One landing slug: letters, digits and hyphens, at most 40 */
const LANDING_SLUG = '[A-Za-z0-9-]{1,40}';

// `?slugs=a,b,c`: 1 to 20 distinct landing slugs, case-insensitive
const LandingCountsQuerySchema = v.object({
  slugs: v.pipe(
    v.string(),
    v.regex(
      new RegExp(`^${LANDING_SLUG}(?:,${LANDING_SLUG})*$`),
      'Expected a comma-separated list of slugs',
    ),
    v.transform((value) => [...new Set(value.toLowerCase().split(','))]),
    v.maxLength(20, 'At most 20 slugs'),
  ),
});

const LandingFactsParamSchema = v.object({
  slug: v.pipe(v.string(), v.regex(new RegExp(`^${LANDING_SLUG}$`))),
  type: LandingTypeSchema,
});

// Registered before the facts route, which has a slug where this has `counts`
app.get(
  '/landing/:type/counts',
  vValidator('param', v.object({ type: LandingTypeSchema })),
  vValidator('query', LandingCountsQuerySchema),
  async (c) => {
    const slugs = c.req.valid('query').slugs;
    const counts = await getLandingCounts(c.req.valid('param').type, slugs);

    // A slug this build doesn't know (a web deploy ahead of the API's) is
    // left out: that answer must not be kept for a week
    const complete = Object.keys(counts.counts).length === new Set(slugs).size;
    c.header('Cache-Control', cacheHeader(complete ? 'medium' : 'short'));

    return c.json(counts);
  },
);

// `:type` only matches the six landing types; anything else is a plain 404
app.get(
  `/landing/:type{${LANDING_TYPES.join('|')}}/:slug{[A-Za-z0-9-]+}/facts`,
  vValidator('param', LandingFactsParamSchema),
  async (c) => {
    // A slug that isn't a landing is a cacheable 404, like the catalogue routes
    c.header('Cache-Control', cacheHeader('medium'));

    const { slug, type } = c.req.valid('param');
    const facts = await getLandingFacts(type, slug);

    if (!facts) {
      return c.notFound();
    }

    return c.json(facts);
  },
);

// Only yesterday to tomorrow (see DayQuerySchema): each date is its own CDN key
// The day's build is stored: built by one Lambda, and yesterday's
// stands in while it is built or when TMDB can't be asked (short-cached)
app.get('/go-deeper', vValidator('query', DayQuerySchema), async (c) => {
  const date = c.req.valid('query').date;
  const { fallback, value } = await readThroughDay({
    day: date,
    key: (day) => `go-deeper:v2:${day}`,
    load: () => buildGoDeeper(date),
    ttl: () => CACHE_LIFE.short.sMaxAge,
  });

  c.header(
    'Cache-Control',
    fallback ? PARTIAL_CACHE_CONTROL : cacheHeader('short'),
  );

  return c.json(value);
});

app.get('/countries', async (c) => {
  const countries = await fetchCountries();

  c.header('Cache-Control', cacheHeader('long'));

  return c.json(countries);
});

app.get('/languages', async (c) => {
  const languages = await fetchLanguages();

  c.header('Cache-Control', cacheHeader('long'));

  return c.json(languages);
});

app.get(
  '/watch-providers',
  vValidator('query', WatchProvidersQuerySchema),
  async (c) => {
    const { include_colors: includeColors, region: regionParam } =
      c.req.valid('query');
    const region = regionParam || 'US';
    const watchProviders = await fetchWatchProviders(region);

    c.header('Cache-Control', cacheHeader('medium'));

    if (includeColors === 'true') {
      const enrichedWatchProviders =
        await enrichWatchProvidersWithColors(watchProviders);
      return c.json(enrichedWatchProviders);
    }

    return c.json(watchProviders);
  },
);

export default app;
