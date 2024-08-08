'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { useSearchParams } from 'next/navigation';

import SelectSeason from '@/components/List/EpisodesListSelectSeason';
import List from '@/components/List/List';
import { type Season, type Episode, type TvSeries } from '@/types/tv-series';

import SkeletonEpisode from '../Skeletons/SkeletonEpisode';
import EpisodeTile from '../Tiles/Episode';

export default function EpisodesList({
  item,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  Readonly<{
    item: TvSeries;
  }>) {
  const [isPending, startTransition] = useTransition();
  const lastFetchedKey = useRef<string>('');
  const searchParams = useSearchParams();
  const selectedSeason = useMemo(
    () =>
      item.seasons?.find(
        (season) =>
          season.seasonNumber.toString() ===
          (searchParams.get('season') ?? '1'),
      ),
    [item.seasons, searchParams],
  );

  const fetchKey = `tv/${item.id}/season/${selectedSeason?.seasonNumber}`;
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const title = useMemo(
    () =>
      item.seasons && item.seasons?.length > 1 ? (
        <SelectSeason item={item} />
      ) : (
        selectedSeason?.title
      ),
    [item, selectedSeason?.title],
  );

  useEffect(() => {
    if (isPending || lastFetchedKey.current === fetchKey) {
      return;
    }

    lastFetchedKey.current = fetchKey;

    startTransition(async () => {
      const response = await fetch(`/api/${fetchKey}`);
      const json = (await response.json()) as Season;
      if (json) {
        setEpisodes(json.episodes);
      } else {
        setEpisodes([]);
      }
    });
  }, [fetchKey, isPending]);

  return (
    <List key={fetchKey} title={title} {...rest}>
      {isPending
        ? [...Array(10)].map((_, index) => <SkeletonEpisode key={index} />)
        : episodes.map((episode) => (
            <EpisodeTile key={episode.id} item={episode} priority />
          ))}
    </List>
  );
}
