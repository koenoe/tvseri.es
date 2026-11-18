import { idListSchema } from '@tvseri.es/schemas';
import * as v from 'valibot';

/** A positive integer id in a path segment (TMDB ids), as a number */
export const NumericIdSchema = v.pipe(
  v.string(),
  v.regex(/^[1-9]\d{0,9}$/, 'Expected a numeric id'),
  v.transform(Number),
);

/** A user id (a ULID; bounded so it can't be anything as a key) */
export const UserIdSchema = v.pipe(v.string(), v.regex(/^[\w-]{1,64}$/));

/**
 * The longest stored username: names chosen before the 30-character cap
 * went up to 128 and stay readable
 */
const STORED_USERNAME_MAX = 128;

/** A stored username to look up (any shape: lookups slugify), bounded */
export const UsernameParamSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(STORED_USERNAME_MAX),
);

/**
 * `/user/:id`: a user id (any case, stored upper case) or `@username` (the
 * web's Library), as the lookup it asks for
 */
export const UserRefSchema = v.union([
  v.pipe(
    UserIdSchema,
    v.transform((userId) => ({ userId: userId.toUpperCase() })),
  ),
  v.pipe(
    v.string(),
    v.startsWith('@'),
    v.transform((ref) => ref.slice(1)),
    UsernameParamSchema,
    v.transform((username) => ({ username })),
  ),
]);

/** `/:id`: a show's, person's, keyword's or network's TMDB id */
export const IdParamSchema = v.object({ id: NumericIdSchema });

/** A season or episode number in a path segment (0 for specials), as a number */
const numberParam = (max: number) =>
  v.pipe(
    v.string(),
    v.regex(/^\d{1,4}$/, 'Expected a number'),
    v.transform(Number),
    v.maxValue(max),
  );

/** `/series/:id/season/:season` */
export const SeasonParamSchema = v.object({
  ...IdParamSchema.entries,
  season: numberParam(999),
});

/** `/series/:id/season/:season/episode/:episode` */
export const EpisodeParamSchema = v.object({
  ...SeasonParamSchema.entries,
  episode: numberParam(9999),
});

/** A list item's show id in a path segment */
export const ItemIdParamSchema = v.object({ 'item-id': NumericIdSchema });

/** The mark routes' `/series/:series-id`, as numbers (EpisodeForWatchedSchema's bounds) */
export const MarkSeriesParamSchema = v.object({ 'series-id': NumericIdSchema });

export const MarkSeasonParamSchema = v.object({
  ...MarkSeriesParamSchema.entries,
  season: numberParam(999),
});
const MAX_IDS = 50;

/**
 * `?ids=3,1,2`: up to 50 distinct ids. Clients should send them sorted, so
 * equal lists share one CDN key.
 */
export const IdListQuerySchema = v.object({ ids: idListSchema(MAX_IDS) });

/** Searches: a trimmed `q` of 1 to 100 characters */
const SearchTextSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1),
  v.maxLength(100),
);

export const SearchQuerySchema = v.object({ q: SearchTextSchema });

export const SeriesSearchQuerySchema = v.object({
  q: SearchTextSchema,
  year: v.optional(v.pipe(v.string(), v.regex(/^\d{4}$/))),
});

/**
 * `?region=gb`: a country code, written upper case. An empty value counts as
 * absent, like before.
 */
export const RegionQuerySchema = v.object({
  region: v.optional(
    v.pipe(v.string(), v.trim(), v.toUpperCase(), v.regex(/^(?:[A-Z]{2})?$/)),
  ),
});

export const WatchProvidersQuerySchema = v.object({
  ...RegionQuerySchema.entries,
  include_colors: v.optional(v.picklist(['true', 'false'])),
});
