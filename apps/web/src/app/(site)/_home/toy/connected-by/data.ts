import 'server-only';

import { HOME_MOMENTS_VERSION } from '@tvseri.es/constants';
import type { ConnectedFrom, ConnectedPath } from '@tvseri.es/schemas';
import { cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import { tags } from '@/lib/cache/tags';
import {
  cacheLifeFor,
  isStandIn,
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';
import { fetchLibraryIds } from '@/lib/marking/server/api';

import { apiDate } from '../../data/day';
import { startOf, unseenPaths, viewerStart } from './viewerPaths';

/**
 * The paths from one start show on `day` (`GET /home/connected`): the same
 * for everyone whose start it is, so a shared cached read keyed by the
 * show and the day (CDN and `use cache`, the `medium` life); `null` when
 * there is no path from it (the API's cached 404). Asked with the moments'
 * version, as the toy, so a change in the build misses every older copy.
 */
async function connectedFrom(
  from: number,
  day: string,
  version: number,
): Promise<ConnectedFrom | null | Unavailable> {
  'use cache';
  cacheTag(tags.home);
  const date = apiDate(day);
  const result = await tryApi(() =>
    apiFetch<ConnectedFrom>('/home/connected', {
      notFound: 'null',
      query: { date, from, v: version },
    }),
  );
  const standIn = !isUnavailable(result) && !!result && isStandIn(result, date);
  cacheLifeFor(standIn ? 'unavailable' : 'medium', result);
  return result;
}

/**
 * A signed-in viewer's Connected by: from one of their finished shows (else
 * a favourite, else a show in progress), the first three paths that end at
 * a show in none of their lists; when that start has none left, the day's
 * shared start (signed out's, already built) the same way. Null when none
 * is left or a read failed: the card then shows the day's shared paths.
 * Per viewer only in the filtering: the paths are shared reads. The shared
 * start's read needs no library, so it is asked beside it: ready when the
 * viewer's own start has nothing left, instead of one read after the other.
 */
export async function getViewerPaths(
  accessToken: string,
  day: string,
  shared: ReadonlyArray<ConnectedPath>,
): Promise<ReadonlyArray<ConnectedPath> | null> {
  const sharedStart = shared[0] ? startOf(shared[0])?.id : undefined;
  const read = (from: number) => connectedFrom(from, day, HOME_MOMENTS_VERSION);
  const sharedRead = sharedStart === undefined ? undefined : read(sharedStart);
  // unawaited when the library read fails or the viewer's start suffices
  sharedRead?.catch(() => undefined);
  const ids = await fetchLibraryIds(accessToken);
  const own = viewerStart(ids, day);
  const ownRead =
    own === undefined || own === sharedStart ? undefined : read(own);
  for (const next of [ownRead, sharedRead]) {
    if (!next) {
      continue;
    }
    const answer = await next;
    const paths =
      isUnavailable(answer) || !answer ? [] : unseenPaths(answer.paths, ids);
    if (paths.length > 0) {
      return paths;
    }
  }
  return null;
}
