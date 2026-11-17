'use client';

import { useMemo } from 'react';

import { useSeriesView } from '@/lib/marking/hooks';
import type { ShowSeasonEpisodes } from '@/lib/series/seasonEpisodes';
import useSeasonEpisodes, { primeSeason } from '@/lib/series/useSeasonEpisodes';
import { useShow } from '../../_lib/ShowProvider';
import { ViewerLocked } from '../../_lib/viewerUnavailable';
import { ClockProvider } from './clock';
import EpisodesView, { signedOutView } from './EpisodesView';
import { useChosenSeason } from './seasonChoice';

type Props = Readonly<{
  seriesId: number;
  /** The viewer's season: Next up's, else the first regular one. */
  defaultSeason: number;
  /** Its episodes from the cached loader (null when the API was unavailable). */
  initial: ShowSeasonEpisodes | null;
  /** Signed in with the marks read: personal facts and states. */
  personal: boolean;
}>;

function LiveEpisodes({ defaultSeason, initial, personal, seriesId }: Props) {
  const selected = useChosenSeason(seriesId, defaultSeason);
  if (initial && typeof window !== 'undefined') {
    // Client only: the module cache must not outlive a server request.
    primeSeason(seriesId, initial);
  }
  const isInitial = initial?.seasonNumber === selected;
  const fetched = useSeasonEpisodes(seriesId, isInitial ? null : selected);
  const show = useShow();
  const seeded = useSeriesView(seriesId);
  // Seeded by the `SeedSeries` rendered just before this; the fallback only
  // covers a store that lost the show.
  const view = useMemo(
    () => seeded ?? signedOutView(seriesId, show.seasons),
    [seeded, seriesId, show.seasons],
  );
  // The viewer's marks didn't load: neutral facts, the controls off (with
  // the reason) until a retry seeds the real state.
  const locked = seeded?.unavailable === true;
  return (
    <ViewerLocked value={locked}>
      <EpisodesView
        personal={personal && !locked}
        season={isInitial ? initial : fetched}
        seasonNumber={selected}
        seriesId={seriesId}
        view={view}
      />
    </ViewerLocked>
  );
}

/**
 * The episodes section for this viewer (the section's request-time hole,
 * rendered after its `SeedSeries`): the selected season (`?season`, else the
 * viewer's default from the server), its episodes (server-rendered or from
 * the tab's season cache), live marks from the store, the wall's paging.
 */
export default function EpisodesClient(props: Props) {
  return (
    <ClockProvider>
      <LiveEpisodes {...props} />
    </ClockProvider>
  );
}
