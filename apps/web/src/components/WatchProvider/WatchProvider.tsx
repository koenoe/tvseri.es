import { cx } from 'class-variance-authority';
import { headers } from 'next/headers';
import Image from 'next/image';

import { fetchTvSeriesWatchProvider } from '@/lib/api';

export default async function WatchProvider({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'US';
  const provider = await fetchTvSeriesWatchProvider(id, region);

  return provider ? (
    <div
      className={cx(
        'relative aspect-square h-7 w-7 overflow-hidden rounded-md',
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
