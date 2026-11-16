import type { SeriesFacts, TasteSplitGenre } from '@tvseri.es/schemas';

import { getListItems } from '@/lib/db/list';
import { fetchGenresForTvSeries } from '@/lib/tmdb';
import { logWarn } from '@/utils/logWarn';

/** Shows per library the genre comparisons read (bounds the facts lookups) */
const GENRE_SAMPLE = 60;
/** A side of the split needs at least this many shows of its genre */
const SPLIT_MIN = 3;
/** ... and the other person at most this many */
const SPLIT_MAX_OTHER = 2;

const SAMPLE_LISTS = ['FAVORITES', 'WATCHED', 'IN_PROGRESS'] as const;

/**
 * The user's most recently added library shows (favourites, finished and in
 * progress), newest first, at most `GENRE_SAMPLE`: one bounded Query per list.
 */
export const getRecentLibraryIds = async (userId: string) => {
  const pages = await Promise.all(
    SAMPLE_LISTS.map((listId) =>
      getListItems({
        listId,
        options: { limit: GENRE_SAMPLE, sortDirection: 'desc' },
        userId,
      }),
    ),
  );
  const items = pages
    .flatMap((page) => page.items)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return [...new Set(items.map((item) => item.id))].slice(0, GENRE_SAMPLE);
};

/** TMDB TV genre names by id; empty when TMDB fails (the callers degrade to no genre) */
export const getGenreNames = async (): Promise<ReadonlyMap<number, string>> => {
  try {
    const genres = await fetchGenresForTvSeries();
    return new Map(genres.map((genre) => [genre.id, genre.name]));
  } catch (error) {
    logWarn('Genre names failed, leaving genres out', error);
    return new Map();
  }
};

/** How many of the shows carry each genre */
export const genreCounts = (
  ids: ReadonlyArray<number>,
  facts: ReadonlyMap<number, SeriesFacts>,
) => {
  const counts = new Map<number, number>();
  for (const id of ids) {
    for (const genreId of facts.get(id)?.genreIds ?? []) {
      counts.set(genreId, (counts.get(genreId) ?? 0) + 1);
    }
  }
  return counts;
};

type SplitCandidate = Readonly<{
  genreId: number;
  count: number;
  otherCount: number;
}>;

/** Genres `mine` has at least 3 shows of and `other` at most 2 */
const splitCandidates = (
  mine: ReadonlyMap<number, number>,
  other: ReadonlyMap<number, number>,
): SplitCandidate[] =>
  [...mine]
    .map(([genreId, count]) => ({
      count,
      genreId,
      otherCount: other.get(genreId) ?? 0,
    }))
    .filter(
      (candidate) =>
        candidate.count >= SPLIT_MIN && candidate.otherCount <= SPLIT_MAX_OTHER,
    );

/** The candidate with most shows; ties alphabetical. Unnamed genres are left out */
const bestNamed = (
  candidates: ReadonlyArray<SplitCandidate>,
  names: ReadonlyMap<number, string>,
) =>
  candidates
    .flatMap((candidate) => {
      const genre = names.get(candidate.genreId);
      return genre ? [{ ...candidate, genre }] : [];
    })
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
    .at(0);

/**
 * "Where your tastes split", from the genres of each library's sample:
 * the owner's biggest genre the viewer has (almost) none of, and the
 * viewer's biggest genre the owner has almost none of.
 */
export const tasteSplit = async (
  ownerIds: ReadonlyArray<number>,
  viewerIds: ReadonlyArray<number>,
  facts: ReadonlyMap<number, SeriesFacts>,
): Promise<
  Readonly<{ theirs: TasteSplitGenre | null; yours: TasteSplitGenre | null }>
> => {
  const ownerCounts = genreCounts(ownerIds, facts);
  const viewerCounts = genreCounts(viewerIds, facts);
  const theirCandidates = splitCandidates(ownerCounts, viewerCounts);
  const yourCandidates = splitCandidates(viewerCounts, ownerCounts);
  // The genre list is one TMDB call: only made when a side can split
  const names =
    theirCandidates.length > 0 || yourCandidates.length > 0
      ? await getGenreNames()
      : new Map<number, string>();

  const theirs = bestNamed(theirCandidates, names);
  const yours = bestNamed(yourCandidates, names);
  return {
    theirs: theirs
      ? {
          genre: theirs.genre,
          ownerCount: theirs.count,
          viewerCount: theirs.otherCount,
        }
      : null,
    yours: yours
      ? {
          genre: yours.genre,
          ownerCount: yours.otherCount,
          viewerCount: yours.count,
        }
      : null,
  };
};
