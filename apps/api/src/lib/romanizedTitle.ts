/**
 * The Latin-script (romaji, romanised) title of a show whose original title
 * is in another script, for the Language landing's script switch.
 *
 * TMDB has no field for it: the romanisation, when it exists, is one of the
 * alternative titles. Kept per show in the Cache table for 30 days (a show's
 * titles hardly ever change), including "none", so those aren't looked up
 * again.
 */

import { readThroughMany } from '@/lib/db/cache/readThrough';
import { fetchTvSeriesTitles } from '@/lib/tmdb';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';

const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days

const cacheKey = (id: number) => `romanized-title:v1:${id}`;

type CachedTitle = Readonly<{ title: string | null }>;

// Letters of the Latin script (with diacritics), plus digits, spaces and punctuation
const LATIN_ONLY = /^[\p{Script=Latin}\p{Script=Common}\p{M}]+$/u;
const ROMANISATION_TYPE = /romaji|romani[sz]|translit/i;

type TitleInput = Readonly<{
  originalName: string;
  originCountry: ReadonlyArray<string>;
  alternativeTitles: ReadonlyArray<
    Readonly<{ iso_3166_1: string; title: string; type: string }>
  >;
}>;

/**
 * `null` when the original title is already Latin or no alternative title
 * looks like its romanisation: a title typed as romaji (or romanised /
 * transliterated) wins, else the first Latin title registered for one of the
 * show's own countries. An English title for another market is not a
 * romanisation, so it's ignored.
 */
export const pickRomanizedTitle = ({
  alternativeTitles,
  originalName,
  originCountry,
}: TitleInput): string | null => {
  if (!originalName || LATIN_ONLY.test(originalName)) {
    return null;
  }

  const latin = alternativeTitles.filter(
    (alternative) => alternative.title && LATIN_ONLY.test(alternative.title),
  );

  const typed = latin.find((alternative) =>
    ROMANISATION_TYPE.test(alternative.type),
  );
  const fromOwnCountry = latin.find((alternative) =>
    originCountry.includes(alternative.iso_3166_1),
  );

  return (typed ?? fromOwnCountry)?.title ?? null;
};

/**
 * Romanised titles by show id (`null` = none, or the show doesn't exist).
 * A TMDB failure rejects, so a partial answer never gets cached.
 */
export const fetchRomanizedTitles = async (
  ids: ReadonlyArray<number>,
): Promise<Map<number, string | null>> => {
  const cached = await readThroughMany<number, CachedTitle>(ids, {
    concurrency: TMDB_CONCURRENCY,
    failures: 'reject',
    key: cacheKey,
    load: async (id) => {
      const titles = await fetchTvSeriesTitles(id);
      return { title: titles ? pickRomanizedTitle(titles) : null };
    },
    ttl: CACHE_TTL,
  });
  return new Map([...cached].map(([id, { title }]) => [id, title] as const));
};
