import { vValidator } from '@hono/valibot-validator';
import type { SearchPerson, SearchResults } from '@tvseri.es/schemas';
import { normalizeSearchQuery } from '@tvseri.es/utils';
import { Hono } from 'hono';
import { bestBlock, rankByTier } from '@/lib/search/ranking';
import { searchTvSeries } from '@/lib/tmdb/discover';
import { searchPerson } from '@/lib/tmdb/person';
import { cacheHeader } from '@/utils/cacheHeader';
import { SearchQuerySchema, SeriesSearchQuerySchema } from '@/utils/params';

const MAX_SERIES = 8;
const MAX_PEOPLE = 4;

const app = new Hono();

// Shows and people in one request, each best match first
app.get('/', vValidator('query', SearchQuerySchema), async (c) => {
  const q = normalizeSearchQuery(c.req.valid('query').q);

  const [seriesResults, peopleResults] = await Promise.all([
    searchTvSeries(q),
    searchPerson(q),
  ]);

  const series = rankByTier(seriesResults, q, (item) => item.title).slice(
    0,
    MAX_SERIES,
  );
  // People without a photo would be a blank face
  const people = rankByTier(
    peopleResults.filter((person) => !!person.image),
    q,
    (person) => person.name,
  ).slice(0, MAX_PEOPLE);

  const results: SearchResults = {
    best: bestBlock(
      series[0] && { name: series[0].title, popularity: series[0].popularity },
      people[0],
      q,
    ),
    people: people.map(
      (person): SearchPerson => ({
        id: person.id,
        image: person.image,
        knownFor: person.knownFor.slice(0, 2).map((item) => item.title),
        knownForDepartment: person.knownForDepartment,
        name: person.name,
        slug: person.slug,
      }),
    ),
    series,
  };

  c.header('Cache-Control', cacheHeader('medium'));

  return c.json(results);
});

app.get('/series', vValidator('query', SeriesSearchQuerySchema), async (c) => {
  const { q, year } = c.req.valid('query');
  const series = await searchTvSeries(q, { year });

  c.header('Cache-Control', cacheHeader('medium'));

  return c.json(series);
});

export default app;
