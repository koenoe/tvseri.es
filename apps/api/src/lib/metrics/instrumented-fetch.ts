import type { BetterFetchOption } from '@better-fetch/fetch';
import { createFetch } from '@better-fetch/fetch';

import { addDependencyMetric } from './context';

type FetchOptions = Parameters<typeof createFetch>[0];

/**
 * Creates an instrumented fetch client that automatically tracks
 * request duration and status for metrics collection.
 *
 * @param source - Identifier for this data source (e.g., 'tmdb', 'mdblist')
 * @param options - Options passed to createFetch
 * @returns Instrumented fetch function
 */
export const createInstrumentedFetch = (
  source: string,
  options: FetchOptions,
) => {
  const baseFetch = createFetch(options);

  return async <T>(path: string, fetchOptions?: BetterFetchOption) => {
    const start = performance.now();
    const timestamp = new Date().toISOString();

    let status = 200;
    let error: string | undefined;

    try {
      const result = await baseFetch<T>(path, fetchOptions);

      if (result.error) {
        status = result.error.status ?? 500;
        error = `HTTP ${status}`;
      }

      return result;
    } catch (e) {
      status = 0;
      error = e instanceof Error ? e.message : 'Unknown error';
      throw e;
    } finally {
      const duration = Math.round(performance.now() - start);

      // Separate path and query params
      const [endpoint, queryString] = path.split('?');
      const params = queryString
        ? Object.fromEntries(new URLSearchParams(queryString))
        : null;

      addDependencyMetric({
        duration,
        endpoint: endpoint ?? path,
        error,
        params,
        source,
        status,
        timestamp,
      });
    }
  };
};
