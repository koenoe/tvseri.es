'use client';

import type { Episode, Season } from '@tvseri.es/schemas';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import SelectSeason from '@/components/List/EpisodesListSeasonSelect';
import List from '@/components/List/List';

import WatchButton from '../Buttons/WatchButton';
import SkeletonEpisode from '../Skeletons/SkeletonEpisode';
import EpisodeTile from '../Tiles/Episode';
import type { EpisodesListSeries } from './toEpisodesListSeries';

/** The season's episodes, or `null` when the fetch failed */
const fetchEpisodes = async (
  tvSeriesId: number,
  seasonNumber: number,
): Promise<Episode[] | null> => {
  try {
    const response = await fetch(
      `/api/tv/${tvSeriesId}/season/${seasonNumber}`,
    );
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as Season;
    return json.episodes ?? [];
  } catch (_error) {
    return null;
  }
};

export default function EpisodesList({
  item,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  Readonly<{
    item: EpisodesListSeries;
  }>) {
  const searchParams = useSearchParams();
  const selectedSeason = useMemo(() => {
    const season = item.seasons.find(
      (season) =>
        season.seasonNumber.toString() === (searchParams.get('season') ?? '1'),
    );
    return season ?? item.seasons[0];
  }, [item.seasons, searchParams]);
  const seasonNumber = selectedSeason?.seasonNumber ?? 1;
  const fetchKey = `tv/${item.id}/season/${seasonNumber}`;

  // Loaded seasons by series and season (fetchKey), so switching back to a
  // season doesn't refetch. A failed fetch is stored as `null` (shown empty)
  // and dropped from the requested set, so coming back to it retries.
  const [loadedSeasons, setLoadedSeasons] = useState<
    ReadonlyMap<string, Episode[] | null>
  >(() => new Map());
  const requestedSeasons = useRef(new Set<string>());
  const episodes = loadedSeasons.get(fetchKey);

  useEffect(() => {
    if (requestedSeasons.current.has(fetchKey)) {
      return;
    }

    requestedSeasons.current.add(fetchKey);

    fetchEpisodes(item.id, seasonNumber).then((result) => {
      if (result === null) {
        requestedSeasons.current.delete(fetchKey);
      }
      setLoadedSeasons((previous) => new Map(previous).set(fetchKey, result));
    });
  }, [fetchKey, item.id, seasonNumber]);

  const title = useMemo(
    () =>
      item.seasons.length > 1 ? (
        <SelectSeason seasons={item.seasons} />
      ) : (
        (selectedSeason?.title ?? '')
      ),
    [item.seasons, selectedSeason?.title],
  );
  const button = useMemo(
    () =>
      selectedSeason &&
      selectedSeason.seasonNumber > 0 &&
      selectedSeason.airDate &&
      new Date(selectedSeason.airDate) <= new Date() ? (
        <WatchButton
          seasonNumber={selectedSeason.seasonNumber}
          tvSeriesId={item.id}
        />
      ) : null,
    [item.id, selectedSeason],
  );

  return (
    <List
      button={button}
      key={fetchKey}
      scrollRestoreKey={fetchKey}
      title={title}
      {...rest}
    >
      {episodes === undefined
        ? [...Array(10)].map((_, index) => <SkeletonEpisode key={index} />)
        : (episodes ?? []).map((episode) => (
            <EpisodeTile item={episode} key={episode.id} tvSeriesId={item.id} />
          ))}
    </List>
  );
}
