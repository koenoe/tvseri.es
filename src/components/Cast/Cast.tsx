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

  return <Avatars className={className} items={cast} />;
}
