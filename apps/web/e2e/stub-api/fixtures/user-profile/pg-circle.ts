import type { CirclePeople, CircleRow } from '@tvseri.es/schemas';
import { watchingNow } from '@tvseri.es/utils';

import { PEOPLE, type PersonName } from './people.ts';
import { entriesOf } from './pg-library.ts';
import { pgShows } from './pg-shows.ts';
import { follows, followsOf, followsWritten, match } from './social.ts';

/**
 * `GET /me/circle/people`, as the API answers it. Levels,
 * rings and proof titles are the ones the viewer sees on each person's
 * profile (`match` in `social.ts`), so the Circle and the match card agree;
 * "Watching" comes from each person's Library (`watchingNow`, the shared
 * logic: their latest In progress show they haven't hidden).
 *
 * alex follows eight people, one per level (juno super, tamsin very high,
 * oskar high, bea medium, leo low, rumi very low) and two with no level yet
 * (ivo, wren); oskar's latest show is hidden, rumi watches nothing. noor
 * and sam follow alex and aren't followed back. (Accounts pending deletion
 * are left out by the API; the stub has none.) The heavy profile follows
 * past the 100-row cap (`capped`).
 */

const CIRCLE = { circle: true } as const;

const LEVEL_ORDER = [
  'super',
  'very-high',
  'high',
  'medium',
  'low',
  'very-low',
] as const;

const levelRank = (row: CircleRow) =>
  row.match.level === null
    ? LEVEL_ORDER.length
    : LEVEL_ORDER.indexOf(row.match.level);

const rowOf = (viewer: PersonName, name: PersonName): CircleRow => {
  const { match: taste } = match(viewer, name);
  return {
    following: follows(viewer, name, CIRCLE),
    followsYou: follows(name, viewer, CIRCLE),
    id: PEOPLE[name].user.id,
    match: {
      arc: taste.arc,
      level: taste.level,
      sharedCount: taste.sharedCount,
      sharedShows: taste.sharedShows.slice(0, 3).map((show) => ({
        id: show.id,
        relation: show.relation,
        title: show.title,
      })),
    },
    username: PEOPLE[name].user.username,
    watching: watchingNow(entriesOf(name)),
  };
};

/** The best match first (ring, then username); no level last */
const byMatch = (a: CircleRow, b: CircleRow) =>
  levelRank(a) - levelRank(b) ||
  b.match.arc - a.match.arc ||
  a.username.localeCompare(b.username);

const LEVELS = [...LEVEL_ORDER, null] as const;

/** The heavy profile's circle: 120 invented follows (the cap is 100) and 12 followers */
const heavyPeople = (): CirclePeople => {
  const shows = pgShows();
  const row = (index: number, followsYou: boolean): CircleRow => {
    const level = LEVELS[index % LEVELS.length] ?? null;
    const show = shows[(index * 7) % shows.length];
    return {
      following: !followsYou || index % 2 === 0,
      followsYou,
      id: `01STUBCIRCLE${String(index).padStart(14, '0')}`,
      match: {
        arc: level ? 92 - LEVEL_ORDER.indexOf(level) * 14 : 0,
        level,
        sharedCount: level ? 60 - (index % 50) : 3,
        sharedShows: shows.slice(index % 40, (index % 40) + 3).map((s) => ({
          id: s.id,
          relation: 'both-finished' as const,
          title: s.title,
        })),
      },
      username: `a-very-long-handle-for-follow-${String(index).padStart(3, '0')}`,
      watching:
        index % 6 === 5 || !show
          ? null
          : { seriesId: show.id, slug: show.slug, title: show.title },
    };
  };
  return {
    capped: true,
    followerCount: PEOPLE['marathonwatcher-2026'].followers,
    followers: Array.from({ length: 12 }, (_, index) => row(200 + index, true)),
    following: Array.from({ length: 100 }, (_, index) =>
      row(index, false),
    ).sort(byMatch),
    followingCount: PEOPLE['marathonwatcher-2026'].following,
  };
};

export const circlePeople = (viewer: PersonName): CirclePeople => {
  if (viewer === 'marathonwatcher-2026') {
    return heavyPeople();
  }
  const { followers, following } = followsOf(viewer);
  const followingRows = following
    .map((name) => rowOf(viewer, name))
    .sort(byMatch);
  // newest follow first: the follow list is in the order the follows were made
  const followerRows = followers
    .filter((name) => !follows(viewer, name, CIRCLE))
    .reverse()
    .map((name) => rowOf(viewer, name));
  // after the viewer follows or unfollows here, their following count is
  // what the list holds (the API's counter follows its stream a moment later)
  const written = followsWritten();
  return {
    capped: false,
    followerCount: Math.max(PEOPLE[viewer].followers, followers.length),
    followers: followerRows,
    following: followingRows,
    followingCount: written
      ? following.length
      : Math.max(PEOPLE[viewer].following, following.length),
  };
};
