import 'server-only';

import type { CountryOrLanguage } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import { tags } from '@/lib/cache/tags';
import {
  allAvailable,
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

import { getLandingCounts, landingCountsKey } from '../data/counts';
import type { LandingChip } from '../landing';
import { chipsWithShows, landingSlugs } from './indexChips';

/** The counts route takes 20 slugs per call */
const COUNTS_PER_CALL = 20;

type Kind = 'country' | 'language';

const PATH: Readonly<Record<Kind, string>> = {
  country: '/discover/countries',
  language: '/discover/languages',
};

/**
 * The chips of `/country` or `/language`: TMDB's list (`GET
 * /discover/countries|languages`, `long`), cut to the ones with a landing
 * and at least one show (the landing counts, 20 a call, `medium`).
 */
export async function getIndexChips(
  type: Kind,
): Promise<ReadonlyArray<LandingChip> | Unavailable> {
  'use cache';
  cacheTag(tags.landingIndex(type));

  const entries = await tryApi(() =>
    apiFetch<ReadonlyArray<CountryOrLanguage>>(PATH[type]),
  );
  if (isUnavailable(entries)) {
    cacheLife('unavailable');
    return entries;
  }
  const slugs = [...landingSlugs(type, entries)].sort();
  const counts = allAvailable(
    await Promise.all(
      Array.from(
        { length: Math.ceil(slugs.length / COUNTS_PER_CALL) },
        (_, index) =>
          getLandingCounts(
            type,
            landingCountsKey(
              slugs.slice(
                index * COUNTS_PER_CALL,
                (index + 1) * COUNTS_PER_CALL,
              ),
            ),
          ),
      ),
    ),
  );
  // a partial list would be cached for a week: pass the failure on
  if (isUnavailable(counts)) {
    cacheLife('unavailable');
    return counts;
  }
  cacheLife('medium');
  return chipsWithShows(type, entries, Object.assign({}, ...counts));
}
