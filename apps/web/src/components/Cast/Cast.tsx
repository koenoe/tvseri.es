import { fetchTvSeriesCredits } from '@/lib/api';

import Avatars from '../Avatars/Avatars';

export default async function Cast({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  const { cast } = await fetchTvSeriesCredits(id);
  const items = cast.slice(0, 10);

  return items.length > 0 ? (
    <Avatars className={className} items={items} />
  ) : (
    <div className={className} />
  );
}
