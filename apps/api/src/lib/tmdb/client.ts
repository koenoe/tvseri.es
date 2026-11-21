import type {
  TmdbAppendable,
  TmdbAppended,
  TmdbPath,
  TmdbResponse,
} from '@tvseri.es/schemas';
import { Resource } from 'sst';
import { createInstrumentedFetch } from '@/lib/metrics';
import { upstreamBaseUrl } from '@/lib/upstream/baseUrl';
import { breakerFor } from '@/lib/upstream/breaker';
import { budgetFor } from '@/lib/upstream/budget';
import { takeCappedCall } from '@/lib/upstream/requestCap';
import { dedupe } from '@/utils/dedupe';

/**
 * Read on first request, not at import: Lambdas that reach this module only
 * through a shared import and never call TMDB (account deletion) then don't
 * need the TMDB links.
 */
const credentials = () => {
  const apiKey = Resource.TmdbApiKey.value;
  const accessToken = Resource.TmdbApiAccessToken.value;
  if (!apiKey || !accessToken) {
    throw new Error('No "API_KEY" found for TMDb');
  }
  return { accessToken, apiKey };
};

/**
 * Every TMDB request goes through the instance's TMDB budget (calls in
 * flight and started per second, per kind of Lambda: lib/upstream/budget.ts)
 * and the TMDB circuit breaker (lib/upstream/breaker.ts), inside the
 * instrumented fetch. Both live as long as the Lambda instance, not the
 * request: an instance serves one request at a time, but work a timed-out
 * request left running resumes in the next invocation and still holds its
 * slots (as its `dedupe` entries do).
 */
const $fetch = createInstrumentedFetch(
  'tmdb',
  { baseURL: upstreamBaseUrl('TMDB', 'https://api.themoviedb.org') },
  { breaker: breakerFor('tmdb'), budget: budgetFor('tmdb'), retries: 1 },
);

/**
 * An id the mark routes still pass as the text their `{[0-9]+}` matched: it
 * goes into the TMDB path as it is (the URL and the cache keys stay what
 * they were), typed as a number for the path patterns. Gone once those
 * routes pass their validated number.
 */
export const pathId = (id: number | string): number => id as number;

type TmdbFetchOptions<A extends string> = Readonly<{
  /** Sub-resources in the same call (`append_to_response`), in this order */
  append?: ReadonlyArray<A>;
  query?: Readonly<Record<string, boolean | number | string | undefined>>;
  /** A query string already built (`?…`), sent as it is after the path */
  search?: string;
}>;

/**
 * A GET of a TMDB path, typed by its pattern (`/3/tv/${number}`): its JSON
 * and the appended sub-resources; undefined on a 404.
 */
export async function tmdbFetch<
  P extends TmdbPath,
  A extends TmdbAppendable<P> = never,
>(
  path: P,
  { append, query: params, search = '' }: TmdbFetchOptions<A> = {},
): Promise<(TmdbResponse<P> & TmdbAppended<P, A>) | undefined> {
  const url = `${path}${search}`;
  const query = append
    ? { ...params, append_to_response: append.join(',') }
    : params;
  // Dedupe concurrent requests to the same path within a Lambda invocation
  const cacheKey = `${url}${query ? JSON.stringify(query) : ''}`;

  return dedupe(cacheKey, async () => {
    takeCappedCall('tmdb');
    const { apiKey } = credentials();

    const { data, error } = await $fetch<TmdbResponse<P> & TmdbAppended<P, A>>(
      url,
      {
        headers: { 'content-type': 'application/json' },
        query: { ...query, api_key: apiKey },
      },
    );

    if (error?.status === 404) {
      return undefined;
    }

    if (error) {
      throw new Error(`HTTP error status: ${error.status}`);
    }

    // A 200 always has a body; null only when there was none
    return data ?? undefined;
  });
}

/** An image TMDB gave a file for (the spec leaves `file_path` optional) */
export const hasFilePath = <T extends Readonly<{ file_path?: string | null }>>(
  image: T,
): image is T & Readonly<{ file_path: string }> => !!image.file_path;
