import type { LibraryIds } from '@tvseri.es/schemas';
import { vi } from 'vitest';

import type { SeriesSeed } from '../types';

const json = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body)));

/**
 * A browser `fetch` for a signed-in viewer's marking reads in component
 * tests: `/api/me/library-ids` answers `library`, `/api/me/series/:id` a
 * seed with nothing watched (on the watchlist when `library` has it).
 */
export function viewerFetch(library: Partial<LibraryIds> = {}) {
  const ids: LibraryIds = {
    favorites: [],
    inProgress: [],
    watched: [],
    watchlist: [],
    ...library,
  };
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const series = /\/api\/me\/series\/(\d+)$/.exec(url);
    if (series) {
      const seriesId = Number(series[1]);
      const seed: SeriesSeed = {
        fetchedAt: 1,
        seasons: [{ airedEpisodeCount: 8, episodeCount: 8, seasonNumber: 1 }],
        seriesId,
        status: {
          isFavorited: false,
          isWatchlisted: ids.watchlist.includes(seriesId),
          prefs: {
            firstTrackingAnsweredAt: null,
            neverAskBefore: false,
            skipped: [],
          },
        },
        watched: [],
      };
      return json(seed);
    }
    return json(ids);
  });
}
