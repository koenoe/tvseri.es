import type {
  Circle,
  CirclePerson,
  CirclePick,
  LibraryIds,
  User,
} from '@tvseri.es/schemas';

import { getFollowing } from '@/lib/db/follow';
import { getLibraryIds } from '@/lib/db/list';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { computeTaste, newToViewer, toTasteShow } from '@/lib/tasteMatch';
import {
  genreCounts,
  getGenreNames,
  getRecentLibraryIds,
} from '@/lib/tasteSplit';
import { createLimiter } from '@/utils/limit';

/** People read (most recently followed first): one library Query each */
const CIRCLE_PEOPLE = 20;
const PICKS = 3;
/** Picks ranked before the facts lookup, so a show TMDB doesn't know can drop out */
const PICK_CANDIDATES = 6;
const PEOPLE_PER_PICK = 2;
const LIBRARY_CONCURRENCY = 10;

/** A show new to the viewer, and who in the circle has it (rank indexes, closest first) */
type Candidate = {
  id: number;
  favouritedBy: number[];
  finishedBy: number[];
};

type RankedPick = Readonly<{
  candidate: Candidate;
  kind: CirclePick['kind'];
}>;

/** Lexicographic on the ranks: closer people first, then more of them */
const compareRanks = (a: ReadonlyArray<number>, b: ReadonlyArray<number>) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? Infinity) - (b[i] ?? Infinity);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
};

const backers = (candidate: Candidate) =>
  [...new Set([...candidate.favouritedBy, ...candidate.finishedBy])].sort(
    (a, b) => a - b,
  );

/**
 * The picks in order: a favourite of the closest match who has one, then a
 * show two or more people finished, then the best of the rest (closest
 * people first, favourites before finished).
 */
const rankPicks = (candidates: ReadonlyArray<Candidate>): RankedPick[] => {
  const picks: RankedPick[] = [];
  const isFree = (candidate: Candidate) =>
    !picks.some((pick) => pick.candidate.id === candidate.id);

  const favourite = candidates
    .filter((candidate) => candidate.favouritedBy.length > 0)
    .sort((a, b) => compareRanks(a.favouritedBy, b.favouritedBy) || a.id - b.id)
    .at(0);
  if (favourite) {
    picks.push({ candidate: favourite, kind: 'favourite' });
  }

  const finishedTogether = candidates
    .filter((candidate) => isFree(candidate) && candidate.finishedBy.length > 1)
    .sort((a, b) => compareRanks(a.finishedBy, b.finishedBy) || a.id - b.id)
    .at(0);
  if (finishedTogether) {
    picks.push({ candidate: finishedTogether, kind: 'finished' });
  }

  const rest = candidates
    .filter(isFree)
    .sort(
      (a, b) =>
        compareRanks(backers(a), backers(b)) ||
        b.favouritedBy.length - a.favouritedBy.length ||
        a.id - b.id,
    );
  for (const candidate of rest) {
    picks.push({
      candidate,
      kind: candidate.favouritedBy.length > 0 ? 'favourite' : 'finished',
    });
  }
  return picks.slice(0, PICK_CANDIDATES);
};

/** Every show some followed person favourited or finished that is new to the viewer */
const collectCandidates = (
  viewer: LibraryIds,
  libraries: ReadonlyArray<LibraryIds>,
) => {
  const candidates = new Map<number, Candidate>();
  libraries.forEach((library, rank) => {
    const favourites = new Set(library.favorites);
    const finished = new Set(library.watched);
    for (const id of newToViewer(viewer, library)) {
      const candidate = candidates.get(id) ?? {
        favouritedBy: [],
        finishedBy: [],
        id,
      };
      if (favourites.has(id)) {
        candidate.favouritedBy.push(rank);
      }
      if (finished.has(id)) {
        candidate.finishedBy.push(rank);
      }
      candidates.set(id, candidate);
    }
  });
  return [...candidates.values()];
};

/**
 * From your circle: up to three shows the people you follow favourited
 * or finished that are in none of your lists, closest taste match first.
 * Reads at most 20 people's libraries and the facts of 6 candidate shows plus
 * your 60 most recent library shows (for the genre "door" line).
 */
export const getCircle = async (
  viewer: Pick<User, 'id' | 'followingCount'>,
): Promise<Circle> => {
  const [{ items: following }, viewerLibrary] = await Promise.all([
    getFollowing({
      options: { limit: CIRCLE_PEOPLE },
      skipPendingDeletion: true,
      userId: viewer.id,
    }),
    getLibraryIds(viewer.id),
  ]);
  // The counter is written by the follow stream: never below what we read
  const followingCount = Math.max(viewer.followingCount ?? 0, following.length);
  if (following.length === 0) {
    return { followingCount, picks: [] };
  }

  const limit = createLimiter(LIBRARY_CONCURRENCY);
  const libraries = await Promise.all(
    following.map((person) => limit(() => getLibraryIds(person.id))),
  );
  const ranked = following
    .map((person, index) => {
      const library = libraries[index] as LibraryIds;
      return { library, person, taste: computeTaste(viewerLibrary, library) };
    })
    .sort(
      (a, b) =>
        b.taste.score - a.taste.score ||
        a.person.username.localeCompare(b.person.username),
    );
  const people: CirclePerson[] = ranked.map(({ person, taste }) => ({
    id: person.id,
    level: taste.level,
    username: person.username,
  }));

  const ordered = rankPicks(
    collectCandidates(
      viewerLibrary,
      ranked.map((entry) => entry.library),
    ),
  );
  if (ordered.length === 0) {
    return { followingCount, picks: [] };
  }

  const viewerSample = await getRecentLibraryIds(viewer.id);
  const facts = await getSeriesFacts([
    ...ordered.map((pick) => pick.candidate.id),
    ...viewerSample,
  ]);
  const chosen = ordered
    .filter((pick) => facts.has(pick.candidate.id))
    .slice(0, PICKS);

  // A door: the show's main genre is one the viewer has no show of
  const viewerGenres = genreCounts(viewerSample, facts);
  const mainGenre = (id: number) => facts.get(id)?.genreIds[0];
  const doorGenres = chosen.flatMap((pick) => {
    const genreId = mainGenre(pick.candidate.id);
    return genreId !== undefined && !viewerGenres.has(genreId) ? [genreId] : [];
  });
  const names =
    doorGenres.length > 0 ? await getGenreNames() : new Map<number, string>();

  return {
    followingCount,
    picks: chosen.flatMap(({ candidate, kind }): CirclePick[] => {
      const show = toTasteShow(candidate.id, facts.get(candidate.id));
      const genreId = mainGenre(candidate.id);
      const ranks =
        kind === 'favourite' ? candidate.favouritedBy : candidate.finishedBy;
      return show
        ? [
            {
              doorGenre:
                genreId !== undefined && doorGenres.includes(genreId)
                  ? (names.get(genreId) ?? null)
                  : null,
              kind,
              people: ranks
                .slice(0, PEOPLE_PER_PICK)
                .flatMap((rank) => people[rank] ?? []),
              show,
            },
          ]
        : [];
    }),
  };
};
