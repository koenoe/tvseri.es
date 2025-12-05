import type { Keyword } from '@tvseri.es/schemas';

import { apiFetch } from './client';

export async function fetchKeyword(id: number | string) {
  const keyword = (await apiFetch(`/keyword/${id}`)) as Keyword | undefined;
  return keyword;
}

export async function searchKeywords(query: string) {
  const keywords = (await apiFetch('/search/keyword', {
    query: {
      q: query,
    },
  })) as Keyword[];
  return keywords;
}
