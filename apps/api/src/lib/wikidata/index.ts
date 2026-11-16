import type { PersonFamilyAndAwards } from '@tvseri.es/schemas';
import { readThrough } from '@/lib/db/cache/readThrough';
import { createInstrumentedFetch } from '@/lib/metrics';
import { logWarn } from '@/utils/logWarn';

import {
  buildPersonQuery,
  toPersonFamilyAndAwards,
  type WikidataResults,
} from './person';

const WIKIDATA_TIMEOUT = 4000;

const $fetch = createInstrumentedFetch(
  'wikidata',
  {
    baseURL: 'https://query.wikidata.org',
    headers: {
      accept: 'application/sparql-results+json',
      // Wikidata asks for a descriptive User-Agent with a way to reach us
      'user-agent': 'tvseri.es/1.0 (https://www.tvseri.es)',
    },
  },
  // One short try: the route answers (without family/awards) inside the
  // web's 10 s when Wikidata is slow
  { attemptTimeout: WIKIDATA_TIMEOUT, retries: 0 },
);

const IMDB_PERSON_ID = /^nm\d{1,10}$/;
const HIT_TTL = 7 * 24 * 60 * 60;
const MISS_TTL = 24 * 60 * 60;

const EMPTY_FAMILY_AND_AWARDS: PersonFamilyAndAwards = {
  awards: null,
  family: null,
};

/**
 * Spouse, children and awards from Wikidata (matched on the IMDb id), cached
 * for 7 days, "nothing there" for 1 day. Never throws: when Wikidata is down
 * it returns `{ ok: false }` and nothing is cached.
 */
export const fetchPersonFamilyAndAwards = async (
  imdbId: string | undefined | null,
): Promise<Readonly<{ ok: boolean; value: PersonFamilyAndAwards }>> => {
  if (!imdbId || !IMDB_PERSON_ID.test(imdbId)) {
    return { ok: true, value: EMPTY_FAMILY_AND_AWARDS };
  }

  try {
    const value = await readThrough<PersonFamilyAndAwards | null>(
      `wikidata-person:v2:${imdbId}`,
      (found) => (found ? HIT_TTL : MISS_TTL),
      async () => {
        const { data, error } = await $fetch<WikidataResults>('/sparql', {
          query: { format: 'json', query: buildPersonQuery(imdbId) },
        });
        if (error) {
          throw new Error(`Wikidata HTTP error status: ${error.status}`);
        }
        return toPersonFamilyAndAwards(data ?? {});
      },
    );
    return { ok: true, value: value ?? EMPTY_FAMILY_AND_AWARDS };
  } catch (error) {
    logWarn('Wikidata lookup failed, showing no family or awards', error);
    return { ok: false, value: EMPTY_FAMILY_AND_AWARDS };
  }
};
