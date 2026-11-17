import { FollowIncludeSchema } from '@tvseri.es/schemas';
import * as v from 'valibot';

import { parseLimit } from '@/utils/query';

/**
 * Query params of the /user/:id read routes. Values stay strings where the
 * handlers parse them (dates: 400 on garbage; limit: clamped), the rest are
 * picklists instead of casts.
 */
const page = {
  cursor: v.optional(v.pipe(v.string(), v.maxLength(2048))),
  limit: v.optional(v.pipe(v.string(), v.maxLength(6))),
  sort_direction: v.optional(v.picklist(['asc', 'desc'])),
};

const dateRange = {
  end_date: v.optional(v.pipe(v.string(), v.maxLength(40))),
  start_date: v.optional(v.pipe(v.string(), v.maxLength(40))),
};

export const DateRangeQuerySchema = v.object(dateRange);

export const HistoryQuerySchema = v.object({ ...page, ...dateRange });

/** `?include=facts` costs a facts lookup and a Watched query per item: the UI pages are 5 and 20 */
const LIST_FACTS_MAX_LIMIT = 24;

export const ListQuerySchema = v.pipe(
  v.object({
    ...page,
    ...dateRange,
    /** `facts`: each item gains `facts: ListItemFacts | null` (`limit` ≤ 24) */
    include: v.optional(v.picklist(['facts'])),
    sort_by: v.optional(v.picklist(['createdAt', 'title', 'position'])),
  }),
  v.check(
    (query) =>
      query.include !== 'facts' ||
      parseLimit(query.limit, { max: Number.POSITIVE_INFINITY }) <=
        LIST_FACTS_MAX_LIMIT,
    `limit is at most ${LIST_FACTS_MAX_LIMIT} with include=facts`,
  ),
);

/** `?view=progress|track` on a series' watched episodes and the marks' answers */
export const WatchedViewQuerySchema = v.object({
  view: v.optional(v.picklist(['progress', 'track'])),
});

/** `?include=watching` reads two small items per row: the Circle pages are 24 */
const FOLLOW_WATCHING_MAX_LIMIT = 24;

/** The follow lists: a page, plus `include=watching` (each row gains `watching`, `limit` ≤ 24) */
export const FollowListQuerySchema = v.pipe(
  v.object({ ...page, include: v.optional(FollowIncludeSchema) }),
  v.check(
    (query) =>
      query.include !== 'watching' ||
      parseLimit(query.limit, { max: Number.POSITIVE_INFINITY }) <=
        FOLLOW_WATCHING_MAX_LIMIT,
    `limit is at most ${FOLLOW_WATCHING_MAX_LIMIT} with include=watching`,
  ),
);
