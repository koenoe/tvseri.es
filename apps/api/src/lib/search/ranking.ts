import { normalizeSearchQuery } from '@tvseri.es/utils';

/**
 * How well a name matches the query, 0 best:
 * 0 the whole name; 1 whole words of it, anywhere ("cranston" in "Bryan
 * Cranston" as much as in "Cranston Johnson"); 2 the start of a word
 * ("lost" in "Lostboys"); 3 anything else. Where in the name the words sit
 * doesn't count: a surname is as good a match as a first name, and within a
 * tier popularity decides ("cranston" once opened an obscure Cranston
 * Johnson instead of Bryan Cranston).
 */
const matchTier = (name: string, query: string) => {
  const title = normalizeSearchQuery(name);
  if (title === query) {
    return 0;
  }
  const padded = ` ${title} `;
  if (padded.includes(` ${query} `)) {
    return 1;
  }
  if (padded.includes(` ${query}`)) {
    return 2;
  }
  return 3;
};

type Ranked = Readonly<{ popularity?: number }>;

/** Best match first: by tier, then popularity (stable, so TMDB order breaks ties) */
export const rankByTier = <T extends Ranked>(
  items: ReadonlyArray<T>,
  query: string,
  nameOf: (item: T) => string,
): ReadonlyArray<T> =>
  items
    .map((item) => ({ item, tier: matchTier(nameOf(item), query) }))
    .sort(
      (a, b) =>
        a.tier - b.tier || (b.item.popularity ?? 0) - (a.item.popularity ?? 0),
    )
    .map(({ item }) => item);

type Named = Readonly<{ name: string; popularity?: number }>;

/** The block holding the best match: tier, then popularity; ties go to the show */
export const bestBlock = (
  series: Named | undefined,
  person: Named | undefined,
  query: string,
): 'people' | 'series' | null => {
  if (!series && !person) {
    return null;
  }
  if (!series || !person) {
    return series ? 'series' : 'people';
  }
  const tierDiff =
    matchTier(person.name, query) - matchTier(series.name, query);
  if (tierDiff !== 0) {
    return tierDiff > 0 ? 'series' : 'people';
  }
  return (person.popularity ?? 0) > (series.popularity ?? 0)
    ? 'people'
    : 'series';
};
