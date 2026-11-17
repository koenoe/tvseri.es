import 'server-only';

import { revalidateTag } from 'next/cache';

import { tags } from '@/lib/cache/tags';

/**
 * Call from a server action after the viewer's own watched history changed
 * (a mark, unmark, re-date, skip or import succeeded): their Stats pages and
 * share cards refresh soon instead of up to a day later (visitors keep the cached `stats` profile otherwise).
 *
 * It marks the `stats:{id}` tag stale (`revalidateTag(tag, 'max')`): the
 * next visit gets the cached page and regenerates it in the background, so
 * the visit after shows the years list and counts the API has then (current
 * within seconds of the mark). The year sections are the API's CDN copies,
 * which follow the `stats` profile (a day).
 * The share card's CDN copy keeps its own Cache-Control.
 *
 * Not `updateTag`: in a server action it makes Next re-render the whole
 * current page into the action's response and purge the browser's router
 * cache, so every mark re-rendered the show page on the server and
 * re-prefetched every link on it (and the e2e saw the response never end,
 * which stalls the marking core's per-show write chain). A
 * stale-while-revalidate profile expires the same entries without that.
 *
 * It never throws: the write it follows already succeeded, so a failed
 * refresh is logged and the user's action still reports success.
 *
 * @example
 * // lib/marking/actions.ts, after a successful write:
 * revalidateViewerStats(session.user.id);
 */
export function revalidateViewerStats(viewerId: string): void {
  try {
    revalidateTag(tags.stats(viewerId), 'max');
  } catch (error) {
    console.error('[stats] refresh after a write failed', error);
  }
}
