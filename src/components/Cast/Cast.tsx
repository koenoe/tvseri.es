import { fetchTvSeriesCredits } from '@/lib/tmdb';

import Avatars from '../Avatars/Avatars';

export default async function Cast({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  const { cast } = await fetchTvSeriesCredits(id);

  return cast.length > 0 ? (
    <Avatars className={className} items={cast} />
  ) : (
    <div className={className} />
  );
}
