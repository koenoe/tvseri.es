/**
 * Dependency endpoints (TMDB, MDBList) for the API metrics aggregation: drops
 * TMDB paths with a non-numeric id where one is required, and folds ids,
 * seasons and episodes into placeholders so one operation is one row.
 */
import { compile, match } from 'path-to-regexp';

/** TMDB sub-resource keywords that are valid (not IDs) */
const TMDB_KEYWORDS = new Set([
  'airing_today',
  'changes',
  'latest',
  'now_playing',
  'on_the_air',
  'popular',
  'top_rated',
  'upcoming',
]);

/** TMDB resources that require numeric IDs */
const TMDB_NUMERIC_ID_RESOURCES = new Set([
  'account',
  'collection',
  'company',
  'keyword',
  'list',
  'movie',
  'network',
  'person',
  'tv',
]);

/** TMDB resources that should have IDs normalized */
const TMDB_ID_RESOURCES = new Set([
  'account',
  'collection',
  'company',
  'credit',
  'keyword',
  'list',
  'movie',
  'network',
  'person',
  'review',
  'tv',
]);

/** MDBList supported ID providers */
const MDBLIST_PROVIDERS = new Set(['imdb', 'mal', 'tmdb', 'trakt', 'tvdb']);

/** MDBList supported media types */
const MDBLIST_MEDIA_TYPES = new Set(['any', 'movie', 'show']);

const compileOpts = { encode: false } as const;

const tmdbValidationMatcher = match<{
  id: string;
  path?: string[];
  resource: string;
}>('/3/:resource/:id{/*path}', { decode: decodeURIComponent });

type PatternParams = Record<string, string | undefined>;
type PatternTransform = (
  params: PatternParams,
) => Record<string, string> | null;

type NormalizationPattern = {
  matcher: ReturnType<typeof match>;
  template: ReturnType<typeof compile>;
  transform: PatternTransform;
};

const hasResource = (set: Set<string>, value: string | undefined): boolean =>
  value !== undefined && set.has(value);

const isNumeric = (value: string | undefined): boolean =>
  value !== undefined && /^\d+$/.test(value);

const tmdbNormalizationPatterns: NormalizationPattern[] = [
  {
    matcher: match('/3/:resource/:id/season/:season/episode/:episode/:sub'),
    template: compile(
      '/3/:resource/:id/season/:season/episode/:episode/:sub',
      compileOpts,
    ),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, episode: ':num', id: ':id', season: ':num' }
        : null,
  },
  {
    matcher: match('/3/:resource/:id/season/:season/episode/:episode'),
    template: compile(
      '/3/:resource/:id/season/:season/episode/:episode',
      compileOpts,
    ),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, episode: ':num', id: ':id', season: ':num' }
        : null,
  },
  {
    matcher: match('/3/:resource/:id/season/:season/:sub'),
    template: compile('/3/:resource/:id/season/:season/:sub', compileOpts),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, id: ':id', season: ':num' }
        : null,
  },
  {
    matcher: match('/3/:resource/:id/season/:season'),
    template: compile('/3/:resource/:id/season/:season', compileOpts),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, id: ':id', season: ':num' }
        : null,
  },
  {
    matcher: match('/3/:resource/:id/:sub/:subsub'),
    template: compile('/3/:resource/:id/:sub/:subsub', compileOpts),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, id: ':id' }
        : null,
  },
  {
    matcher: match('/3/:resource/:id/:sub'),
    template: compile('/3/:resource/:id/:sub', compileOpts),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, id: ':id' }
        : null,
  },
  {
    matcher: match('/3/find/:id'),
    template: compile('/3/find/:id', compileOpts),
    transform: () => ({ id: ':id' }),
  },
  {
    matcher: match('/3/:resource/:id'),
    template: compile('/3/:resource/:id', compileOpts),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, id: ':id' }
        : null,
  },
];

const mdblistNormalizationPatterns: NormalizationPattern[] = [
  {
    matcher: match('/lists/:user/:list/items'),
    template: compile('/lists/:user/:list/items', compileOpts),
    transform: (params) =>
      isNumeric(params.user) ? null : { list: ':list', user: ':user' },
  },
  {
    matcher: match('/lists/:id/items'),
    template: compile('/lists/:id/items', compileOpts),
    transform: (params) => (isNumeric(params.id) ? { id: ':id' } : null),
  },
  {
    matcher: match('/lists/user/:id'),
    template: compile('/lists/user/:id', compileOpts),
    transform: (params) =>
      isNumeric(params.id) ? { id: ':id' } : { id: ':username' },
  },
  {
    matcher: match('/lists/:user/:list'),
    template: compile('/lists/:user/:list', compileOpts),
    transform: (params) =>
      isNumeric(params.user) ? null : { list: ':list', user: ':user' },
  },
  {
    matcher: match('/lists/:id'),
    template: compile('/lists/:id', compileOpts),
    transform: (params) => (isNumeric(params.id) ? { id: ':id' } : null),
  },
  {
    matcher: match('/external/lists/:id'),
    template: compile('/external/lists/:id', compileOpts),
    transform: (params) => (isNumeric(params.id) ? { id: ':id' } : null),
  },
  {
    matcher: match('/:provider/:mediaType/:id'),
    template: compile('/:provider/:mediaType/:id', compileOpts),
    transform: (params) =>
      hasResource(MDBLIST_PROVIDERS, params.provider) &&
      hasResource(MDBLIST_MEDIA_TYPES, params.mediaType)
        ? { ...params, id: ':id' }
        : null,
  },
];

export const isValidTmdbEndpoint = (endpoint: string): boolean => {
  const result = tmdbValidationMatcher(endpoint);
  if (!result) return true;

  const { id, resource } = result.params;
  if (!TMDB_NUMERIC_ID_RESOURCES.has(resource)) return true;
  if (/^\d+$/.test(id)) return true;
  if (TMDB_KEYWORDS.has(id.toLowerCase())) return true;

  return false;
};

const normalizeTmdbEndpoint = (endpoint: string): string => {
  for (const { matcher, template, transform } of tmdbNormalizationPatterns) {
    const result = matcher(endpoint);
    if (result) {
      const params = transform(result.params as Record<string, string>);
      if (params) return template(params);
    }
  }
  return endpoint;
};

const normalizeMdblistEndpoint = (endpoint: string): string => {
  for (const { matcher, template, transform } of mdblistNormalizationPatterns) {
    const result = matcher(endpoint);
    if (result) {
      const params = transform(result.params as Record<string, string>);
      if (params) return template(params);
    }
  }
  return endpoint;
};

export const normalizeDependencyEndpoint = (
  source: string,
  endpoint: string,
): string => {
  const normalizedSource = source.toLowerCase();

  if (normalizedSource === 'dynamodb') return endpoint;
  if (normalizedSource === 'tmdb') return normalizeTmdbEndpoint(endpoint);
  if (normalizedSource === 'mdblist') return normalizeMdblistEndpoint(endpoint);

  return endpoint;
};
