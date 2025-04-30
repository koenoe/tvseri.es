import { unstable_cacheLife } from 'next/cache';

import { fetchTvSeriesCredits } from '@/lib/tmdb';

import Avatars from '../Avatars/Avatars';

export default async function Cast({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  'use cache';
  unstable_cacheLife('days');

  const { cast } = await fetchTvSeriesCredits(id);
  const items = cast.slice(0, 10);

  return items.length > 0 ? (
    <Avatars className={className} items={items.slice(0, 10)} />
  ) : (
    <div className={className} />
  );
}
