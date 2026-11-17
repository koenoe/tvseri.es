import 'server-only';

import type { LibraryCounts, LibrarySummary } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';
import { tryApi, type Unavailable } from '@/lib/cache/unavailable';
import type { LibraryRead } from '@/lib/profile/shelfPage';

import {
  type SeenShow,
  unseenShows,
} from '../../_components/overview/get-started/loadGetStarted';
import { loadViewerLibrary } from '../../_data/library';
import type { Profile } from '../../_data/profile';
import { loadTrending } from '../../_data/trending';

/**
 * The shelf counts (`GET /user/:id/library`, one partition read). The nav,
 * the chips and the header share it: `apiFetch` dedupes it per render. An
 * outage is `Unavailable`: the counts then stay ghosts.
 */
export function loadLibrarySummary({
  accessToken,
  userId,
}: LibraryRead): Promise<LibraryCounts | Unavailable> {
  return tryApi(async () => {
    const summary = await apiFetch<LibrarySummary>('/user/:id/library', {
      accessToken,
      params: { id: userId },
    });
    return summary.counts;
  });
}

/**
 * Day 0's "Seen any of these?": Popular this week minus every show already
 * in the viewer's lists (Get started's rule, `unseenShows`). Unlike the
 * overview, no other block on the page borrows from it.
 */
export async function loadSeenChoices(
  profile: Profile,
): Promise<ReadonlyArray<SeenShow>> {
  const [shows, library] = await Promise.all([
    loadTrending(),
    loadViewerLibrary(profile),
  ]);
  return unseenShows(shows ?? [], library);
}
