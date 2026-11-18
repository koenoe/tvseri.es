import * as v from 'valibot';

const DISCOVER_SORT_BY_OPTIONS = [
  'popularity.desc',
  'first_air_date.desc',
  'vote_average.desc',
  'vote_count.desc',
  'first_air_date.asc',
  'original_name.asc',
  'popularity.asc',
  'vote_average.asc',
  'vote_count.asc',
] as const;

/** Matches the API default in `buildDiscoverQuery`, so it can be omitted from the query. */
const DEFAULT_DISCOVER_SORT_BY = 'popularity.desc';

/** TMDB serves at most 500 pages for discover. */
const MAX_DISCOVER_PAGE = 500;

/** Upper bound for the number of values in a list filter (e.g. `with_genres=18,35`). */
const MAX_DISCOVER_LIST_VALUES = 20;

/**
 * List filters use `,` (AND) or `|` (OR) as separator. Mixing both is invalid.
 */
function listPattern(item: string) {
  return new RegExp(`^(?:${item}(?:,${item})*|${item}(?:\\|${item})*)$`);
}

const ID = '\\d{1,10}';
const COUNTRY = '[A-Z]{2}';
const LANGUAGE = '[a-z]{2}';

const IdListSchema = v.pipe(v.string(), v.regex(listPattern(ID)));

/** TMDB statuses 0-5 (0 = Returning Series) and types 0-6 (0 = Documentary) */
const StatusListSchema = v.pipe(v.string(), v.regex(listPattern('[0-5]')));
const TypeListSchema = v.pipe(v.string(), v.regex(listPattern('[0-6]')));

/** `YYYY-MM-DD`, a real calendar date: `2026-02-30` passes the pattern but not this check. */
export const IsoDateSchema = v.pipe(
  v.string(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/),
  v.check((value) => {
    const time = new Date(`${value}T00:00:00Z`).getTime();
    return (
      !Number.isNaN(time) && new Date(time).toISOString().startsWith(value)
    );
  }),
);

/** 0 to 10, up to two decimals */
const RatingSchema = v.pipe(
  v.string(),
  v.regex(/^(?:10(?:\.0{1,2})?|\d(?:\.\d{1,2})?)$/),
);
const CountSchema = v.pipe(v.string(), v.regex(/^\d{1,7}$/));
const RuntimeSchema = v.pipe(v.string(), v.regex(/^\d{1,5}$/));

export const DiscoverQuerySchema = v.object({
  'air_date.gte': v.optional(IsoDateSchema),
  'air_date.lte': v.optional(IsoDateSchema),
  'first_air_date.gte': v.optional(IsoDateSchema),
  'first_air_date.lte': v.optional(IsoDateSchema),
  sort_by: v.optional(v.picklist(DISCOVER_SORT_BY_OPTIONS)),
  'vote_average.gte': v.optional(RatingSchema),
  'vote_average.lte': v.optional(RatingSchema),
  'vote_count.gte': v.optional(CountSchema),
  'vote_count.lte': v.optional(CountSchema),
  watch_region: v.optional(v.pipe(v.string(), v.regex(/^[A-Z]{2}$/))),
  with_genres: v.optional(IdListSchema),
  with_keywords: v.optional(IdListSchema),
  with_networks: v.optional(IdListSchema),
  with_origin_country: v.optional(
    v.pipe(v.string(), v.regex(listPattern(COUNTRY))),
  ),
  with_original_language: v.optional(
    v.pipe(v.string(), v.regex(listPattern(LANGUAGE))),
  ),
  'with_runtime.gte': v.optional(RuntimeSchema),
  'with_runtime.lte': v.optional(RuntimeSchema),
  with_status: v.optional(StatusListSchema),
  with_type: v.optional(TypeListSchema),
  with_watch_providers: v.optional(IdListSchema),
  without_genres: v.optional(IdListSchema),
  without_keywords: v.optional(IdListSchema),
});

export type DiscoverQuery = v.InferOutput<typeof DiscoverQuerySchema>;

type DiscoverQueryKey = keyof DiscoverQuery;

// The schema's keys, sorted: the canonical query string uses this key order.
const DISCOVER_QUERY_KEYS: ReadonlyArray<DiscoverQueryKey> = (
  Object.keys(DiscoverQuerySchema.entries) as DiscoverQueryKey[]
).sort();

const LIST_KEYS: ReadonlySet<DiscoverQueryKey> = new Set([
  'with_genres',
  'with_keywords',
  'with_networks',
  'with_origin_country',
  'with_original_language',
  'with_status',
  'with_type',
  'with_watch_providers',
  'without_genres',
  'without_keywords',
]);

// `8.0` and `8` are one filter: written as a plain number
const NUMBER_KEYS: ReadonlySet<DiscoverQueryKey> = new Set([
  'vote_average.gte',
  'vote_average.lte',
  'vote_count.gte',
  'vote_count.lte',
  'with_runtime.gte',
  'with_runtime.lte',
]);

function canonicalizeValue(key: DiscoverQueryKey, value: string) {
  if (LIST_KEYS.has(key)) {
    return canonicalizeList(value);
  }
  return NUMBER_KEYS.has(key) ? String(Number(value)) : value;
}

type DiscoverQueryInput =
  | URLSearchParams
  | Readonly<Record<string, string | ReadonlyArray<string> | undefined>>;

function getFirstValue(input: DiscoverQueryInput, key: string) {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined;
  }
  const value = input[key];
  return typeof value === 'string' ? value : value?.[0];
}

function canonicalizeList(value: string) {
  const separator = value.includes('|') ? '|' : ',';
  const values = [...new Set(value.split(separator))]
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .slice(0, MAX_DISCOVER_LIST_VALUES);
  return values.join(separator);
}

export type NormalizedDiscoverQuery = Readonly<{
  query: Readonly<Record<string, string>>;
  /** Canonical query string including the leading `?`, or `''` when empty. */
  queryString: string;
}>;

/**
 * Turns arbitrary discover search params into one canonical query, so equal filters
 * always produce the same upstream request (and cache key):
 * - keeps only known keys and drops values that don't validate
 * - dedupes and sorts list values, writes numbers plainly (`8.0` is `8`), sorts keys
 * - drops defaults (`sort_by=popularity.desc`)
 * - keeps `watch_region` only when a watch provider filter is set (TMDB ignores it otherwise);
 *   falls back to `options.region` in that case
 *
 * Idempotent: normalising a normalised query returns the same query.
 */
export function normalizeDiscoverQuery(
  input: DiscoverQueryInput,
  options: Readonly<{ region?: string }> = {},
): NormalizedDiscoverQuery {
  const entries: Array<[string, string]> = [];

  for (const key of DISCOVER_QUERY_KEYS) {
    const rawValue = getFirstValue(input, key)?.trim();
    const value =
      key === 'watch_region' && !rawValue ? options.region : rawValue;

    if (!value) {
      continue;
    }

    const result = v.safeParse(DiscoverQuerySchema.entries[key], value);
    if (!result.success || !result.output) {
      continue;
    }

    entries.push([key, canonicalizeValue(key, result.output)]);
  }

  const hasWatchProviders = entries.some(
    ([key]) => key === 'with_watch_providers',
  );
  const query = Object.fromEntries(
    entries.filter(
      ([key, value]) =>
        !(key === 'sort_by' && value === DEFAULT_DISCOVER_SORT_BY) &&
        !(key === 'watch_region' && !hasWatchProviders),
    ),
  );

  const searchParams = new URLSearchParams(query).toString();

  return {
    query,
    queryString: searchParams ? `?${searchParams}` : '',
  };
}

/**
 * Parses a discover page cursor. A missing cursor means the first page.
 * Returns `null` for anything that isn't an integer within 1..MAX_DISCOVER_PAGE.
 */
export function parseDiscoverPage(cursor: string | null | undefined) {
  if (!cursor) {
    return 1;
  }
  if (!/^\d{1,3}$/.test(cursor)) {
    return null;
  }
  const page = Number(cursor);
  return page >= 1 && page <= MAX_DISCOVER_PAGE ? page : null;
}
