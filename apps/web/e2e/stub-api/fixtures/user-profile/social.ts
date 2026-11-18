import type { Circle, TasteMatchResponse, TasteShow } from '@tvseri.es/schemas';

import { PEOPLE, type PersonName } from './people.ts';
import { type ShowKey, sharedLine, showOf } from './shows.ts';
import { day } from './time.ts';

const taste = (key: ShowKey, reason?: TasteShow['reason']): TasteShow => ({
  id: showOf(key).id,
  posterImage: showOf(key).poster,
  ...(reason ? { reason } : {}),
  slug: showOf(key).slug,
  title: showOf(key).title,
});

/** Who follows whom (follower → followed) */
const FOLLOWS: ReadonlyArray<readonly [PersonName, PersonName]> = [
  ['alex', 'juno'],
  ['alex', 'wren'],
  ['alex', 'ivo'],
  ['juno', 'alex'],
  ['wren', 'alex'],
  ['noor', 'alex'],
  ['sam', 'alex'],
  ['ivo', 'juno'],
  ['alex', 'tamsin'],
  ['alex', 'oskar'],
  ['alex', 'bea'],
];

/**
 * The Circle's follows: the above plus alex following leo and rumi,
 * so alex's eight follows cover every match level (PEOPLE.alex.following is
 * 8). Only the Circle routes read these (`/me/circle/people`, the follow
 * lists with `include=watching`); the overview's From your circle, the
 * follow state and the fixed profile fixtures keep the six above.
 */
const CIRCLE_FOLLOWS: ReadonlyArray<readonly [PersonName, PersonName]> = [
  ...FOLLOWS,
  ['alex', 'leo'],
  ['alex', 'rumi'],
];

type Scope = Readonly<{ circle?: boolean }>;

/**
 * Follows and unfollows written through the API in this copy of the stub
 * (each test signs in to its own copy): `from>to` → followed or not. The
 * seeds above stay as they are; the reads apply these on top.
 */
const written = new Map<string, boolean>();

/** `POST /user/:id/follow` / `DELETE /user/:id/unfollow`, as the API stores them */
export const writeFollow = (
  from: PersonName,
  to: PersonName,
  following: boolean,
): void => {
  written.set(`${from}>${to}`, following);
};

/** Whether this copy of the stub has follow writes (then the counters are the lists' lengths) */
export const followsWritten = (): boolean => written.size > 0;

const followsIn = ({ circle = false }: Scope = {}) => {
  const seeds = circle ? CIRCLE_FOLLOWS : FOLLOWS;
  if (written.size === 0) {
    return seeds;
  }
  const kept = seeds.filter(([a, b]) => written.get(`${a}>${b}`) !== false);
  const added = [...written]
    .filter(([pair, on]) => on && !kept.some(([a, b]) => `${a}>${b}` === pair))
    .map(([pair]) => pair.split('>') as [PersonName, PersonName]);
  return [...kept, ...added];
};

export const follows = (
  from: PersonName,
  to: PersonName,
  scope: Scope = {},
): boolean => followsIn(scope).some(([a, b]) => a === from && b === to);

/** Who follows `name` and whom `name` follows in the Circle, oldest follow first */
export const followsOf = (name: PersonName) => ({
  followers: followsIn({ circle: true })
    .filter(([, b]) => b === name)
    .map(([a]) => a),
  following: followsIn({ circle: true })
    .filter(([a]) => a === name)
    .map(([, b]) => b),
});

const followUser = (
  name: PersonName,
  viewer: PersonName | null,
  scope: Scope,
) => {
  const { user, followers, following } = PEOPLE[name];
  return {
    createdAt: user.createdAt,
    followerCount: followers,
    followingCount: following,
    id: user.id,
    isFollower: viewer ? follows(name, viewer, scope) : false,
    isFollowing: viewer ? follows(viewer, name, scope) : false,
    isMe: viewer === name,
    username: user.username,
  };
};

/** `GET /user/:id/followers` and `/following` */
export const followPage = (
  name: PersonName,
  type: 'followers' | 'following',
  viewer: PersonName | null,
  scope: Scope = {},
) => ({
  items: followsIn(scope)
    .filter(([a, b]) => (type === 'followers' ? b === name : a === name))
    .map(([a, b]) => (type === 'followers' ? a : b))
    .map((other) => followUser(other, viewer, scope)),
  nextCursor: null,
});

type Level = TasteMatchResponse['match']['level'];

/** The other match cards, one per level: who shares what with alex */
const LEVEL_CARDS: Partial<
  Record<
    PersonName,
    Readonly<{
      arc: number;
      level: Level;
      shared: number;
      proof: ReadonlyArray<ShowKey>;
      picks: ReadonlyArray<readonly [ShowKey, TasteShow['reason']]>;
    }>
  >
> = {
  bea: {
    arc: 48,
    level: 'medium',
    picks: [
      ['frieren', 'favourite'],
      ['haikyu', 'finished'],
      ['witchHat', 'watching'],
    ],
    proof: ['severance', 'whiteLotus'],
    shared: 12,
  },
  leo: {
    arc: 30,
    level: 'low',
    picks: [
      ['theChosen', 'favourite'],
      ['xmen', 'finished'],
    ],
    proof: ['mobland'],
    shared: 5,
  },
  oskar: {
    arc: 64,
    level: 'high',
    picks: [
      ['wednesday', 'finished'],
      ['dark', 'finished'],
    ],
    proof: ['gildedAge', 'whiteLotus', 'pitt'],
    shared: 19,
  },
  rumi: {
    arc: 14,
    level: 'very-low',
    picks: [
      ['frieren', 'favourite'],
      ['haikyu', 'finished'],
      ['xmen', 'finished'],
    ],
    proof: ['blackDoves', 'mobland'],
    shared: 6,
  },
  tamsin: {
    arc: 78,
    level: 'very-high',
    picks: [
      ['shogun', 'favourite'],
      ['lastOfUs', 'finished'],
      ['dark', 'finished'],
    ],
    proof: ['whiteLotus', 'mobland', 'severance'],
    shared: 27,
  },
};

const levelMatch = (
  viewer: PersonName,
  owner: PersonName,
  card: NonNullable<(typeof LEVEL_CARDS)[PersonName]>,
): TasteMatchResponse => ({
  following: follows(viewer, owner),
  followsYou: follows(owner, viewer),
  match: {
    arc: card.arc,
    level: card.level,
    notEnough: false,
    sharedCount: card.shared,
    sharedShows: card.proof.map((key) => ({
      ...taste(key),
      ...sharedLine(key),
      finishedSeason: null,
      next: null,
      relation: 'both-watching' as const,
    })),
  },
  newToYou: card.picks.map(([key, reason]) => taste(key, reason)),
  split: { theirs: null, yours: null },
});

/** `GET /user/:id/match`: alex visiting juno is Super, others lower */
export const match = (
  viewer: PersonName,
  owner: PersonName,
): TasteMatchResponse => {
  const isJuno = owner === 'juno';
  const card = LEVEL_CARDS[owner];
  if (card) {
    return levelMatch(viewer, owner, card);
  }
  return {
    following: follows(viewer, owner),
    followsYou: follows(owner, viewer),
    match: isJuno
      ? {
          arc: 92,
          level: 'super',
          notEnough: false,
          sharedCount: 34,
          sharedShows: [
            {
              ...taste('pitt'),
              ...sharedLine('pitt'),
              finishedSeason: null,
              next: { date: day(59), kind: 'season-premiere', season: 3 },
              relation: 'both-favourite',
            },
            {
              ...taste('severance'),
              ...sharedLine('severance'),
              finishedSeason: 2,
              next: { date: day(67), kind: 'season-premiere', season: 3 },
              relation: 'both-finished',
            },
            {
              ...taste('dexter'),
              ...sharedLine('dexter'),
              finishedSeason: null,
              next: { date: day(6), episode: 3, kind: 'episode', season: 2 },
              relation: 'both-watching',
            },
            {
              ...taste('blackDoves'),
              ...sharedLine('blackDoves'),
              finishedSeason: null,
              next: { kind: 'season-out', season: 2 },
              relation: 'both-watching',
            },
          ],
        }
      : {
          arc: 0,
          level: null,
          notEnough: true,
          sharedCount: 2,
          sharedShows: [
            {
              // no facts: the row keeps its facts line's height
              ...taste('mcmafia'),
              finishedSeason: 1,
              next: null,
              relation: 'both-finished',
            },
          ],
        },
    newToYou: isJuno
      ? [
          taste('dark', 'favourite'),
          taste('shogun', 'finished'),
          taste('mcmafia', 'finished'),
        ]
      : [taste('frieren', 'favourite')],
    split: isJuno
      ? {
          theirs: {
            genre: 'Animation',
            genreId: 16,
            ownerCount: 41,
            viewerCount: 0,
          },
          yours: {
            genre: 'Crime',
            genreId: 80,
            ownerCount: 2,
            viewerCount: 23,
          },
        }
      : { theirs: null, yours: null },
  };
};

/** `GET /me/circle` (Dark, McMafia, Frieren) */
export const circle = (viewer: PersonName): Circle => {
  const following = FOLLOWS.filter(([a]) => a === viewer).length;
  if (viewer !== 'alex') {
    return { followingCount: following, picks: [] };
  }
  const person = (
    name: PersonName,
    level: 'super' | 'very-high' | 'medium',
    arc: number,
  ) => ({
    arc,
    id: PEOPLE[name].user.id,
    level,
    username: PEOPLE[name].user.username,
  });
  return {
    followingCount: following,
    picks: [
      {
        doorGenre: null,
        kind: 'favourite',
        people: [person('juno', 'super', 92)],
        show: taste('dark'),
      },
      {
        doorGenre: null,
        kind: 'finished',
        people: [person('juno', 'super', 92), person('wren', 'very-high', 78)],
        show: taste('mcmafia'),
      },
      {
        doorGenre: 'Animation',
        kind: 'favourite',
        people: [person('ivo', 'medium', 48)],
        show: taste('frieren'),
      },
    ],
  };
};
