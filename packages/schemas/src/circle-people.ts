/**
 * The profile Circle: `GET /me/circle/people` (the owner's view)
 * and `?include=watching` on `GET /user/:id/followers|following` (a
 * visitor's).
 */

import * as v from 'valibot';

import type { SharedShow, TasteLevel } from './profile-page';

/** What someone is watching now: their most recent In progress show they haven't hidden */
export const WatchingNowSchema = v.object({
  seriesId: v.number(),
  slug: v.string(),
  title: v.string(),
});

export type WatchingNow = v.InferOutput<typeof WatchingNowSchema>;

const TASTE_LEVELS = [
  'very-low',
  'low',
  'medium',
  'high',
  'very-high',
  'super',
] as const satisfies ReadonlyArray<TasteLevel>;

const SHARED_RELATIONS = [
  'both-favourite',
  'both-finished',
  'both-watching',
] as const satisfies ReadonlyArray<SharedShow['relation']>;

/** The same match as `/user/:id/match` (weights and levels), without the facts work */
export const CircleMatchSchema = v.object({
  /** Ring fill, 0 to 100 (0 when there is no level yet) */
  arc: v.number(),
  /** null: "No level yet" (fewer than 5 shared) */
  level: v.nullable(v.picklist(TASTE_LEVELS)),
  sharedCount: v.number(),
  /** At most 3, strongest first: the proof line's titles (from the lists, no TMDB) */
  sharedShows: v.array(
    v.object({
      id: v.number(),
      relation: v.picklist(SHARED_RELATIONS),
      title: v.string(),
    }),
  ),
});

export type CircleMatch = v.InferOutput<typeof CircleMatchSchema>;

export const CircleRowSchema = v.object({
  /** You follow them */
  following: v.boolean(),
  /** They follow you */
  followsYou: v.boolean(),
  id: v.string(),
  match: CircleMatchSchema,
  username: v.string(),
  /** null: "Not watching anything right now" */
  watching: v.nullable(WatchingNowSchema),
});

export type CircleRow = v.InferOutput<typeof CircleRowSchema>;

/** `GET /me/circle/people` */
export const CirclePeopleSchema = v.object({
  /** Rows were left out: more than 100 people (following first) */
  capped: v.boolean(),
  /** The user's counters (at least the rows read) */
  followerCount: v.number(),
  /** People who follow you that you don't follow back, newest follow first ("Follow back") */
  followers: v.array(CircleRowSchema),
  /** Best match first (score, then username); "No level yet" last */
  following: v.array(CircleRowSchema),
  followingCount: v.number(),
});

export type CirclePeople = v.InferOutput<typeof CirclePeopleSchema>;

/** `?include=watching` on the follow lists: each item gains `watching` */
export const FollowIncludeSchema = v.picklist(['watching']);
