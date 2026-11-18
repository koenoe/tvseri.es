import type { WatchedItem, WatchingNow } from '@tvseri.es/schemas';

/**
 * What the sub-pages' client lists read, trimmed on the server for both the
 * first page (RSC props) and later pages (route handlers).
 */

/**
 * One episode in the History diary: a watched item minus what its rows
 * don't draw (where it was watched, when it aired).
 */
export type DiaryItem = Readonly<
  Pick<
    WatchedItem,
    | 'episodeNumber'
    | 'episodeTitle'
    | 'posterImage'
    | 'runtime'
    | 'seasonNumber'
    | 'seriesId'
    | 'slug'
    | 'title'
    | 'watchedAt'
  >
>;

export const toDiaryItem = (item: WatchedItem): DiaryItem => ({
  episodeNumber: item.episodeNumber,
  episodeTitle: item.episodeTitle,
  posterImage: item.posterImage,
  runtime: item.runtime,
  seasonNumber: item.seasonNumber,
  seriesId: item.seriesId,
  slug: item.slug,
  title: item.title,
  watchedAt: item.watchedAt,
});

/**
 * A row on the Social page and the visitor's Circle (`GET /user/:id/followers`,
 * `/following`); `watching` only comes with `?include=watching` (else null).
 */
export type FollowItem = Readonly<{
  id: string;
  username: string;
  followerCount: number;
  followingCount: number;
  isFollower: boolean;
  isFollowing: boolean;
  isMe: boolean;
  /** What they're watching now; null: nothing, or not asked for */
  watching: WatchingNow | null;
}>;

/** The API's row: `watching` is there only when it was asked for */
export type ApiFollowItem = Omit<FollowItem, 'watching'> &
  Readonly<{ watching?: WatchingNow | null }>;

export const toFollowItem = (item: ApiFollowItem): FollowItem => ({
  followerCount: item.followerCount,
  followingCount: item.followingCount,
  id: item.id,
  isFollower: item.isFollower,
  isFollowing: item.isFollowing,
  isMe: item.isMe,
  username: item.username,
  watching: item.watching
    ? {
        seriesId: item.watching.seriesId,
        slug: item.watching.slug,
        title: item.watching.title,
      }
    : null,
});
