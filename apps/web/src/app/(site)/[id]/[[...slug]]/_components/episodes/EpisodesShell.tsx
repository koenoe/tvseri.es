'use client';

import { useMemo } from 'react';

import { useShow } from '../../_lib/ShowProvider';
import type { ShowSeasonEpisodes } from '../../_lib/seasonEpisodes';
import { ClockProvider } from './clock';
import EpisodesView, { signedOutView } from './EpisodesView';

/**
 * The section in the static shell: the viewer hole's Suspense fallback.
 * Someone signed out's default season (the first regular one, Next up = its
 * first episode), drawn at the live wall's exact size. It never reads the
 * marking store (shared HTML, the same for everyone) and is inert: it is a
 * picture until the viewer's wall replaces it, on a hard load before any JS.
 */
export default function EpisodesShell({
  initial,
  seasonNumber,
  seriesId,
}: Readonly<{
  seriesId: number;
  seasonNumber: number;
  /** Its episodes from the cached loader (null when the API was unavailable). */
  initial: ShowSeasonEpisodes | null;
}>) {
  const show = useShow();
  const view = useMemo(
    () => signedOutView(seriesId, show.seasons),
    [seriesId, show.seasons],
  );
  return (
    <div data-placeholder="episodes" inert>
      <ClockProvider>
        <EpisodesView
          personal={false}
          season={initial}
          seasonNumber={seasonNumber}
          seriesId={seriesId}
          view={view}
        />
      </ClockProvider>
    </div>
  );
}
