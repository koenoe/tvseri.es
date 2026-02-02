import { cx } from 'class-variance-authority';
import Image from 'next/image';
import auth from '@/auth';
import { fetchTvSeriesWatchProvider } from '@/lib/api';
import { getRegion } from '@/lib/geo';

export default async function WatchProvider({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  const [region, { user }] = await Promise.all([getRegion(), auth()]);
  const provider = await fetchTvSeriesWatchProvider(
    id,
    user?.country || region,
    user,
  );

  return provider ? (
    <div
      className={cx(
        'relative aspect-square size-7 overflow-hidden rounded-md',
        className,
      )}
    >
      <Image
        alt={provider.name}
        height={56}
        src={provider.logo}
        unoptimized
        width={56}
      />
    </div>
  ) : null;
}
