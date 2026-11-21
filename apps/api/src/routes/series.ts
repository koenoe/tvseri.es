import { vValidator } from '@hono/valibot-validator';
import type {
  Rating,
  RomanizedTitles,
  SeriesSummaries,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as v from 'valibot';
import { fetchTvSeriesImageChoices, getShow } from '@/lib/catalogue';
import { fetchSeasonRatings, fetchShowRating } from '@/lib/omdb';
import { fetchRomanizedTitles } from '@/lib/romanizedTitle';
import { getSeriesFactsReport } from '@/lib/seriesFacts';
import { toSeriesSummary } from '@/lib/seriesFacts/summary';
import { getSeriesRuntimesOf } from '@/lib/seriesRuntimes';
import {
  fetchTvSeriesEpisode,
  fetchTvSeriesEpisodeWithCredits,
  fetchTvSeriesSeason,
} from '@/lib/tmdb/seasons';
import {
  fetchTvSeriesContentRating,
  fetchTvSeriesCredits,
  fetchTvSeriesKeywords,
  fetchTvSeriesRecommendations,
} from '@/lib/tmdb/series';
import { fetchTvSeriesWatchProviders } from '@/lib/tmdb/watchProviders';
import { UpstreamUnavailableError } from '@/lib/upstream/errors';
import { cachedNotFound } from '@/middleware/cacheControl';
import { cacheHeader } from '@/utils/cacheHeader';
import {
  EpisodeParamSchema,
  IdListQuerySchema,
  IdParamSchema,
  RegionQuerySchema,
  SeasonParamSchema,
} from '@/utils/params';

const EpisodeQuerySchema = v.object({
  view: v.optional(v.picklist(['credits'])),
});

const app = new Hono();

const IncludeImagesQuerySchema = v.object({
  include_images: v.optional(v.picklist(['true', 'false'])),
});
// An MDBList rating source (`imdb`, `tmdb`, `trakt`...): one short word
const RatingQuerySchema = v.object({
  source: v.optional(v.pipe(v.string(), v.regex(/^[a-z]{1,20}$/))),
});

app.get(
  '/romanized-titles',
  vValidator('query', IdListQuerySchema),
  async (c) => {
    const { ids } = c.req.valid('query');
    const titles = await fetchRomanizedTitles(ids);

    const body: RomanizedTitles = Object.fromEntries(titles);

    c.header('Cache-Control', cacheHeader('long'));

    return c.json(body);
  },
);

// Meta-line numbers for a list of shows, from the shared series facts (24 h)
app.get('/summaries', vValidator('query', IdListQuerySchema), async (c) => {
  const { ids } = c.req.valid('query');
  const { facts, failed } = await getSeriesFactsReport(ids);
  // A null here would be cached as "no such show": a retryable error instead,
  // never cached (the facts that did load are; the retry fetches the rest)
  if (failed.size > 0) {
    c.header('Cache-Control', 'no-store');
    throw new HTTPException(503, { message: 'Try again shortly' });
  }
  const summaries: SeriesSummaries = Object.fromEntries(
    ids.map((id) => {
      const found = facts.get(id);
      return [id, found ? toSeriesSummary(found) : null];
    }),
  );

  c.header('Cache-Control', cacheHeader('medium'));

  return c.json(summaries);
});

app.get(
  '/:id{[0-9]+}',
  vValidator('param', IdParamSchema),
  vValidator('query', IncludeImagesQuerySchema),
  async (c) => {
    const series = await getShow(c.req.valid('param').id, {
      artwork: c.req.valid('query').include_images === 'true',
      colour: true,
    });

    c.header('Cache-Control', cacheHeader('short'));

    if (!series) {
      return c.notFound();
    }

    return c.json(series);
  },
);

app.get(
  '/:id{[0-9]+}/season/:season{[0-9]+}',
  vValidator('param', SeasonParamSchema),
  async (c) => {
    const season = await fetchTvSeriesSeason(
      c.req.valid('param').id,
      c.req.valid('param').season,
    );

    c.header('Cache-Control', cacheHeader('short'));

    if (!season) {
      return c.notFound();
    }

    return c.json(season);
  },
);

// Every regular season's episode runtimes, in one read (the show page's
// time left and runtime range)
app.get(
  '/:id{[0-9]+}/runtimes',
  vValidator('param', IdParamSchema),
  async (c) => {
    const runtimes = await getSeriesRuntimesOf(c.req.valid('param').id);

    c.header('Cache-Control', cacheHeader('short'));

    if (!runtimes) {
      return c.notFound();
    }

    return c.json(runtimes);
  },
);

// IMDb ratings per episode (OMDb), for the episode modal
app.get(
  '/:id{[0-9]+}/season/:season{[0-9]+}/ratings',
  vValidator('param', SeasonParamSchema),
  async (c) => {
    const { id: seriesId, season } = c.req.valid('param');
    // The IMDb id from the shared series facts: no TMDB call while they are
    // warm, so a spent OMDb quota doesn't cost one either
    const { facts, failed } = await getSeriesFactsReport([seriesId]);
    if (failed.has(seriesId)) {
      throw new UpstreamUnavailableError('tmdb', 10, 'no series facts');
    }
    const show = facts.get(seriesId);

    c.header('Cache-Control', cacheHeader('medium'));

    if (!show) {
      return c.notFound();
    }
    const numberOfSeasons = Math.max(
      0,
      ...show.seasons.map((entry) => entry.seasonNumber),
    );
    // No IMDb id, or a season the show doesn't have: never an OMDb call
    if (!show.imdbId || season > numberOfSeasons) {
      return c.json({ ratings: {} });
    }

    const { definitive, ratings } = await fetchSeasonRatings(
      show.imdbId,
      season,
    );

    // A missing key or a hit limit is temporary: don't let the CDN pin it
    if (!definitive) {
      c.header('Cache-Control', 'no-store');
    }

    return c.json(ratings);
  },
);

app.get(
  '/:id{[0-9]+}/season/:season{[0-9]+}/episode/:episode{[0-9]+}',
  vValidator('param', EpisodeParamSchema),
  vValidator('query', EpisodeQuerySchema),
  async (c) => {
    const fetchEpisode =
      c.req.valid('query').view === 'credits'
        ? fetchTvSeriesEpisodeWithCredits
        : fetchTvSeriesEpisode;
    const episode = await fetchEpisode(
      c.req.valid('param').id,
      c.req.valid('param').season,
      c.req.valid('param').episode,
    );

    c.header('Cache-Control', cacheHeader('short'));

    if (!episode) {
      return c.notFound();
    }

    return c.json(episode);
  },
);

const ImagesQuerySchema = v.object({
  // ISO 639-1, e.g. `ja`
  language: v.optional(v.pipe(v.string(), v.regex(/^[a-z]{2}$/))),
});

app.get(
  '/:id{[0-9]+}/images',
  vValidator('param', IdParamSchema),
  vValidator('query', ImagesQuerySchema),
  async (c) => {
    const images = await fetchTvSeriesImageChoices(
      c.req.valid('param').id,
      c.req.valid('query').language,
    );

    c.header('Cache-Control', cacheHeader('short'));

    if (!images) {
      return c.notFound();
    }

    return c.json(images);
  },
);

app.get(
  '/:id{[0-9]+}/content-rating',
  vValidator('param', IdParamSchema),
  vValidator('query', RegionQuerySchema),
  async (c) => {
    const region = c.req.valid('query').region || 'US';
    const rating = await fetchTvSeriesContentRating(
      c.req.valid('param').id,
      region,
    );

    c.header('Cache-Control', cacheHeader('medium'));

    return c.json(rating);
  },
);

app.get(
  '/:id{[0-9]+}/watch-providers',
  vValidator('param', IdParamSchema),
  vValidator('query', RegionQuerySchema),
  async (c) => {
    const region = c.req.valid('query').region || 'US';
    const providers = await fetchTvSeriesWatchProviders(
      c.req.valid('param').id,
      region,
    );

    c.header('Cache-Control', cacheHeader('short'));

    return c.json(providers ?? []);
  },
);

app.get(
  '/:id{[0-9]+}/credits',
  vValidator('param', IdParamSchema),
  async (c) => {
    const credits = await fetchTvSeriesCredits(c.req.valid('param').id);

    c.header('Cache-Control', cacheHeader('medium'));

    return c.json(credits ?? { cast: [], crew: [] });
  },
);

app.get(
  '/:id{[0-9]+}/recommendations',
  vValidator('param', IdParamSchema),
  async (c) => {
    const items = await fetchTvSeriesRecommendations(c.req.valid('param').id);

    c.header('Cache-Control', cacheHeader('short'));

    return c.json(items ?? []);
  },
);

app.get(
  '/:id{[0-9]+}/keywords',
  vValidator('param', IdParamSchema),
  async (c) => {
    const keywords = await fetchTvSeriesKeywords(c.req.valid('param').id);

    c.header('Cache-Control', cacheHeader('medium'));

    if (!keywords) {
      return c.notFound();
    }

    return c.json(keywords);
  },
);

// The show's IMDb rating (OMDb, by the IMDb id in the shared series facts).
// Only `source=imdb` has one: OMDb gives no other source; any other answers
// null
app.get(
  '/:id{[0-9]+}/rating',
  vValidator('param', IdParamSchema),
  vValidator('query', RatingQuerySchema),
  async (c) => {
    const source = c.req.valid('query').source || 'imdb';
    const seriesId = c.req.valid('param').id;

    c.header('Cache-Control', cacheHeader('short'));

    if (source !== 'imdb') {
      return c.json(null);
    }

    const { facts, failed } = await getSeriesFactsReport([seriesId]);
    if (failed.has(seriesId)) {
      throw new UpstreamUnavailableError('tmdb', 10, 'no series facts');
    }
    const imdbId = facts.get(seriesId)?.imdbId;
    const rating = imdbId ? await fetchShowRating(imdbId) : null;

    return c.json(
      rating && imdbId
        ? ({ imdbid: imdbId, source, ...rating } satisfies Rating)
        : null,
    );
  },
);

// Non-matching paths (e.g. non-numeric ids): cacheable 404, like the real route
app.get('*', cachedNotFound('short'));

export default app;
