import { cx } from 'class-variance-authority';
import { headers } from 'next/headers';
import Image from 'next/image';

import { fetchTvSeriesWatchProviders } from '@/lib/tmdb';

export default async function WatchProvider({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  const region = (await headers()).get('x-vercel-ip-country') || 'US';
  const providers = await fetchTvSeriesWatchProviders(id, region);
  const provider = providers[0];

  return provider ? (
    <div
      className={cx(
        'relative aspect-square h-7 w-7 overflow-hidden rounded-md opacity-90',
        className,
      )}
    >
      <Image
        src={provider.logo}
        alt={provider.name}
        width={56}
        height={56}
        unoptimized
      />
    </div>
  ) : null;
}
