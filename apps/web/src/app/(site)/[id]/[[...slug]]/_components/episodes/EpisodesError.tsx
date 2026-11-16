'use client';

import { RowErrorCard } from '@/components/ui/row/RowError';

import { requestSeason } from '../../_lib/useSeasonEpisodes';
import { WallSkeleton } from './EpisodesSkeleton';
import { seasonName } from './panelRows';

/**
 * A season that didn't load: the per-section error in the wall's own
 * space (the dashed slots keep the loading wall's size, so nothing jumps),
 * one card saying only this failed, with Try again.
 */
export default function EpisodesError({
  seasonNumber,
  seriesId,
}: Readonly<{ seasonNumber: number; seriesId: number }>) {
  const retry = () => requestSeason(seriesId, seasonNumber);
  return (
    <div
      className="relative [--row-end:0px] [--row-start:0px]"
      data-slot="episodes-unavailable"
    >
      <WallSkeleton look="failed" />
      <RowErrorCard
        onRetry={retry}
        state="failed"
        title={seasonName(seasonNumber)}
      />
    </div>
  );
}
