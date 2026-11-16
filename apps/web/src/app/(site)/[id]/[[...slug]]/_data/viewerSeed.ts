import 'server-only';

import type { TvSeries } from '@tvseri.es/schemas';
import { unstable_rethrow } from 'next/navigation';
import { cache } from 'react';

import { getViewer } from '@/auth/viewer';
import { toSeasonInfo } from '@/lib/marking/seasonInfo';
import { readSeriesSeed } from '@/lib/marking/server/seed';
import type { SeriesSeed } from '@/lib/marking/types';

/**
 * The marking seed for this show and viewer: seasons always; signed in, the
 * watched episodes and the list status + prefs. Private (reads the session):
 * call it inside a Suspense hole only. Deduped per request, so every hole
 * that renders `<SeedSeries>` gets the identical seed (a no-op the second
 * time). A failed viewer read seeds `unavailable`: the viewer
 * parts show that their marks didn't load, with Try again, and nothing
 * writes until a retry seeds the real state; never a fake zero.
 */
export const getViewerSeed = cache(
  async (
    series: Pick<TvSeries, 'id' | 'seasons' | 'specials'>,
  ): Promise<Readonly<{ seed: SeriesSeed; signedIn: boolean }>> => {
    const seasons = toSeasonInfo(series);
    const viewer = await getViewer();
    if (!viewer) {
      return { seed: { seasons, seriesId: series.id }, signedIn: false };
    }
    try {
      const seed = await readSeriesSeed(viewer, series.id, series);
      return {
        seed: seed ?? { seasons, seriesId: series.id, unavailable: true },
        signedIn: true,
      };
    } catch (error) {
      // A prerender that ends while this waits is not a failure.
      unstable_rethrow(error);
      console.error('[show] viewer seed failed', error);
      return {
        seed: { seasons, seriesId: series.id, unavailable: true },
        signedIn: true,
      };
    }
  },
);
