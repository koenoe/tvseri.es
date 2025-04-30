import { connection } from 'next/server';

import { type TvSeries } from '@/types/tv-series';

import EpisodesList from './EpisodesList';

export default async function EpisodesListContainer({
  item,
  ...rest
}: React.AllHTMLAttributes<HTMLDivElement> &
  Readonly<{
    item: TvSeries;
  }>) {
  await connection();

  return <EpisodesList item={item} {...rest} />;
}
