import type { Keyword } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from './client';
import { withStringId } from './withStringId';

async function fetchCachedKeyword(id: string) {
  'use cache';
  cacheLife('medium');
  cacheTag(`keyword:${id}`);
  return apiFetch<Keyword>(`/keyword/${id}`, { notFound: 'null' });
}

export const fetchKeyword = withStringId(fetchCachedKeyword);

// Free-text search: high cardinality, so not cached in-process.
export async function searchKeywords(query: string) {
  return apiFetch<Keyword[]>('/search/keyword', {
    query: {
      q: query,
    },
  });
}
