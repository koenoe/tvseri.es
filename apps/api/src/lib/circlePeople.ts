import type {
  CirclePeople,
  CircleRow,
  LibraryIds,
  User,
} from '@tvseri.es/schemas';
import { type LibraryEntry, toLibraryIds, watchingNow } from '@tvseri.es/utils';

import { type FollowUser, getFollowers, getFollowing } from '@/lib/db/follow';
import { readLibrary } from '@/lib/library';
import { computeTaste } from '@/lib/tasteMatch';
import { createLimiter } from '@/utils/limit';

/**
 * The owner's Circle: everyone you follow, ranked by taste
 * match, then the people who follow you that you don't follow back. One
 * library read per person (two Queries of their Lists partition), nothing
 * from TMDB: the level, shared count, the proof line's titles and
 * what they are watching all come from the two libraries.
 */

/** Rows at most (following first); more is `capped` */
const CIRCLE_PEOPLE_CAP = 100;

const LIBRARY_CONCURRENCY = 10;
const PROOF_SHOWS = 3;

type Person = Readonly<{
  user: FollowUser;
  following: boolean;
  followsYou: boolean;
}>;

const titleOf = (
  id: number,
  ...libraries: ReadonlyArray<ReadonlyArray<LibraryEntry>>
) => {
  for (const entries of libraries) {
    const title = entries.find((entry) => entry.id === id)?.title;
    if (title) {
      return title;
    }
  }
  return '';
};

const toRow = (
  person: Person,
  viewer: Readonly<{ ids: LibraryIds; entries: ReadonlyArray<LibraryEntry> }>,
  entries: ReadonlyArray<LibraryEntry>,
): CircleRow & Readonly<{ score: number }> => {
  const taste = computeTaste(viewer.ids, toLibraryIds(entries));
  return {
    following: person.following,
    followsYou: person.followsYou,
    id: person.user.id,
    match: {
      level: taste.level,
      sharedCount: taste.sharedCount,
      sharedShows: taste.sharedShows.slice(0, PROOF_SHOWS).map((show) => ({
        id: show.id,
        relation: show.relation,
        title: titleOf(show.id, entries, viewer.entries),
      })),
    },
    score: taste.score,
    username: person.user.username,
    watching: watchingNow(entries),
  };
};

const withoutScore = ({
  score: _score,
  ...row
}: CircleRow & Readonly<{ score: number }>): CircleRow => row;

export const getCirclePeople = async (
  viewer: Pick<User, 'id' | 'followerCount' | 'followingCount'>,
): Promise<CirclePeople> => {
  const page = {
    options: { limit: CIRCLE_PEOPLE_CAP },
    skipPendingDeletion: true,
    userId: viewer.id,
  };
  const [following, followers, own] = await Promise.all([
    getFollowing(page),
    getFollowers(page),
    readLibrary(viewer.id),
  ]);

  // Both lists are read whole up to the cap, so they answer each other
  const followerIds = new Set(followers.items.map((user) => user.id));
  const followingIds = new Set(following.items.map((user) => user.id));
  const people: Person[] = [
    ...following.items.map((user) => ({
      following: true,
      followsYou: followerIds.has(user.id),
      user,
    })),
    ...followers.items
      .filter((user) => !followingIds.has(user.id))
      .map((user) => ({ following: false, followsYou: true, user })),
  ];
  const listed = people.slice(0, CIRCLE_PEOPLE_CAP);

  const limit = createLimiter(LIBRARY_CONCURRENCY);
  const libraries = await Promise.all(
    listed.map((person) => limit(() => readLibrary(person.user.id))),
  );
  const self = { entries: own.entries, ids: toLibraryIds(own.entries) };
  const rows = listed.map((person, index) =>
    toRow(person, self, libraries[index]?.entries ?? []),
  );

  return {
    capped:
      following.nextCursor !== null ||
      followers.nextCursor !== null ||
      people.length > listed.length,
    followerCount: Math.max(viewer.followerCount ?? 0, followers.items.length),
    followers: rows.filter((row) => !row.following).map(withoutScore),
    following: rows
      .filter((row) => row.following)
      .sort(
        (a, b) =>
          Number(a.match.level === null) - Number(b.match.level === null) ||
          b.score - a.score ||
          a.username.localeCompare(b.username),
      )
      .map(withoutScore),
    followingCount: Math.max(
      viewer.followingCount ?? 0,
      following.items.length,
    ),
  };
};
