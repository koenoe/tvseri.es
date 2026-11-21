'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { useMemo } from 'react';

import { seasonProgress } from '@/lib/marking/progress';
import type { SeriesBase } from '@/lib/marking/types';
import type { ShowEpisode } from '@/lib/series/seasonEpisodes';
import { useShow } from '../../_lib/ShowProvider';
import { SeasonLineGhost } from './EpisodesSkeleton';
import { seasonFacts, seasonFactsEstimate } from './facts';
import type { MarkedEpisode } from './marks';
import SeasonFactsLine, { SeasonFactsGhost } from './SeasonFactsLine';
import SeasonLine from './SeasonLine';
import SeasonSelect from './SeasonSelect';

type Props = Readonly<{
  /** The season just completed by the viewer's mark here (`EpisodesView`) */
  completed: number | null;
  seriesId: number;
  seasonNumber: number;
  /** The season's episodes; null while it loads. */
  episodes: ReadonlyArray<ShowEpisode> | null;
  marked: ReadonlyArray<MarkedEpisode> | null;
  /** The marks the section draws, and its Next up (for the select's rows). */
  view: SeriesBase;
  nextUp: EpisodeRef | null;
  /** The marks are the viewer's: personal facts and select states. */
  personal: boolean;
}>;

/**
 * The season header: "Season 3 ▾" and the facts on the
 * first line, the season line under them at full width.
 */
export default function SeasonHeader({
  completed,
  episodes,
  marked,
  nextUp,
  personal,
  seasonNumber,
  seriesId,
  view,
}: Props) {
  const show = useShow();
  const airDate =
    show.seasons.find((season) => season.seasonNumber === seasonNumber)
      ?.airDate ?? '';
  const facts = useMemo(
    () => (marked ? seasonFacts(marked, airDate, personal) : null),
    [marked, airDate, personal],
  );
  // while the season's episodes load: the line as it will read, as ghosts
  const estimate = useMemo(
    () =>
      marked
        ? null
        : seasonFactsEstimate(
            seasonProgress(view, seasonNumber),
            airDate,
            personal,
          ),
    [marked, view, seasonNumber, airDate, personal],
  );
  return (
    <div
      className="relative flex flex-wrap items-center gap-x-6 gap-y-2"
      data-season-header=""
    >
      <SeasonSelect
        nextUp={personal ? nextUp : null}
        personal={personal}
        seasonNumber={seasonNumber}
        seriesId={seriesId}
        view={view}
      />
      {facts ? <SeasonFactsLine completed={completed} facts={facts} /> : null}
      {estimate ? <SeasonFactsGhost facts={estimate} /> : null}
      {episodes && marked ? (
        <div className="flex min-w-0 basis-full">
          <SeasonLine
            completed={completed}
            episodes={episodes}
            marked={marked}
            seasonNumber={seasonNumber}
            seriesId={seriesId}
          />
        </div>
      ) : (
        <SeasonLineGhost />
      )}
    </div>
  );
}
