import type { Genre } from '@tvseri.es/schemas';

import { apiFetch } from './client';

export async function fetchGenresForTvSeries() {
  const genres = (await apiFetch('/genres')) as Genre[];
  return genres;
}
