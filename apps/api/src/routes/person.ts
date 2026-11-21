import { vValidator } from '@hono/valibot-validator';
import type { PersonFamily } from '@tvseri.es/schemas';
import { Hono } from 'hono';
import { toPersonLinks } from '@/lib/person/links';
import {
  fetchPersonCareer,
  fetchPersonCollaborators,
  fetchPersonShows,
} from '@/lib/person/load';
import {
  fetchPerson,
  fetchPersonExternalIds,
  fetchPersonKnownFor,
} from '@/lib/tmdb/person';
import { fetchPersonFamilyAndAwards } from '@/lib/wikidata';
import { cachedNotFound } from '@/middleware/cacheControl';
import { cacheHeader } from '@/utils/cacheHeader';
import { IdParamSchema } from '@/utils/params';

/**
 * A spouse or child links to their person page with TMDB's own slug (the
 * page's canonical one), so the link never costs a redirect; one TMDB
 * doesn't know is plain text.
 */
const withTmdbSlug = async <
  T extends Readonly<{ slug?: string; tmdbId?: number }>,
>({
  slug: _,
  tmdbId,
  ...person
}: T) => {
  const found = tmdbId ? await fetchPerson(tmdbId) : undefined;
  return found ? { ...person, slug: found.slug, tmdbId } : person;
};

const withTmdbSlugs = async (
  family: PersonFamily | null,
): Promise<PersonFamily | null> => {
  if (!family) {
    return family;
  }
  const [spouses, children] = await Promise.all([
    Promise.all(family.spouses.map(withTmdbSlug)),
    Promise.all(family.children.map(withTmdbSlug)),
  ]);
  return { children, spouses };
};

const app = new Hono();

app.get('/:id{[0-9]{1,10}}', vValidator('param', IdParamSchema), async (c) => {
  const person = await fetchPerson(c.req.valid('param').id);

  c.header('Cache-Control', cacheHeader('medium'));

  if (!person) {
    return c.notFound();
  }

  return c.json(person);
});

// Socials row: IMDb, Instagram, X, TikTok...
app.get(
  '/:id{[0-9]{1,10}}/external-ids',
  vValidator('param', IdParamSchema),
  async (c) => {
    const ids = await fetchPersonExternalIds(c.req.valid('param').id);

    c.header('Cache-Control', cacheHeader('long'));

    if (!ids) {
      return c.notFound();
    }

    return c.json({ links: toPersonLinks(ids) });
  },
);

// Shows list: cast + crew merged, "Self" split out
app.get(
  '/:id{[0-9]{1,10}}/shows',
  vValidator('param', IdParamSchema),
  async (c) => {
    const shows = await fetchPersonShows(c.req.valid('param').id);

    c.header('Cache-Control', cacheHeader('medium'));

    if (!shows) {
      return c.notFound();
    }

    return c.json(shows);
  },
);

// Career chart: a row per series, years across
app.get(
  '/:id{[0-9]{1,10}}/career',
  vValidator('param', IdParamSchema),
  async (c) => {
    const career = await fetchPersonCareer(c.req.valid('param').id);

    c.header('Cache-Control', cacheHeader('medium'));

    if (!career) {
      return c.notFound();
    }

    return c.json(career);
  },
);

// Frequent collaborators: people in 2+ of the person's shows
app.get(
  '/:id{[0-9]{1,10}}/collaborators',
  vValidator('param', IdParamSchema),
  async (c) => {
    const collaborators = await fetchPersonCollaborators(
      c.req.valid('param').id,
    );

    c.header('Cache-Control', cacheHeader('medium'));

    if (!collaborators) {
      return c.notFound();
    }

    return c.json(collaborators);
  },
);

// Spouse, children, awards from Wikidata; never fails when it is down
app.get(
  '/:id{[0-9]{1,10}}/family-and-awards',
  vValidator('param', IdParamSchema),
  async (c) => {
    const person = await fetchPerson(c.req.valid('param').id);

    if (!person) {
      c.header('Cache-Control', cacheHeader('medium'));
      return c.notFound();
    }

    const { ok, value } = await fetchPersonFamilyAndAwards(person.imdbId);

    // A Wikidata outage must not be pinned at the CDN
    c.header('Cache-Control', ok ? cacheHeader('medium') : 'no-store');

    if (!ok) {
      return c.json({ ...value, degraded: true });
    }

    return c.json({ ...value, family: await withTmdbSlugs(value.family) });
  },
);

app.get(
  '/:id{[0-9]{1,10}}/known-for',
  vValidator('param', IdParamSchema),
  async (c) => {
    const person = await fetchPerson(c.req.valid('param').id);

    c.header('Cache-Control', cacheHeader('medium'));

    if (!person) {
      return c.notFound();
    }

    const items = await fetchPersonKnownFor(person);

    return c.json(items);
  },
);

// Non-matching paths (e.g. non-numeric ids): cacheable 404, like the real route
app.get('*', cachedNotFound('medium'));

export default app;
