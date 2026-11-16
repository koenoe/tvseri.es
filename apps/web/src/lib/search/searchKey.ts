import { normalizeSearchQuery } from '@tvseri.es/utils';

/** The longest query the API accepts (1 to 100 characters after trimming). */
export const MAX_QUERY_LENGTH = 100;

/**
 * The query as the CDN and the API see it: normalised (one spelling, one
 * cache entry) and cut to what the API accepts, so a pasted title or a long
 * 404 path never asks for a 400. A lone `@` (Find people opens
 * search with it) is no query yet: search waits for the handle.
 */
export const searchKey = (query: string) => {
  const key = normalizeSearchQuery(query).slice(0, MAX_QUERY_LENGTH).trim();
  return key === '@' ? '' : key;
};
