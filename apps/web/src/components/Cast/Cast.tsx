import { fetchTvSeriesCast } from '@/lib/api';

import Avatars from '../Avatars/Avatars';

export default async function Cast({
  className,
  id,
}: Readonly<{
  className?: string;
  id: number;
}>) {
  // Already trimmed to the top-billed cast inside the cache entry
  const cast = await fetchTvSeriesCast(id);

  return cast.length > 0 ? (
    <Avatars className={className} items={cast} />
  ) : (
    <div className={className} />
  );
}
