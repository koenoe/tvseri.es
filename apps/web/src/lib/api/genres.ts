import type { Genre } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from './client';

export async function fetchGenresForTvSeries() {
  'use cache';
  cacheLife('long');
  cacheTag('genres');
  return apiFetch<Genre[]>('/genres');
}
