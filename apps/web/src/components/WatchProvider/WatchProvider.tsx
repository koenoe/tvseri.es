import { cx } from 'class-variance-authority';
import Image from 'next/image';
import auth from '@/auth';
import { fetchTvSeriesWatchProvider } from '@/lib/api';
import { resolveRegion } from '@/lib/geo';

export default async function WatchProvider({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  const { user } = await auth();
  const provider = await fetchTvSeriesWatchProvider(
    id,
    await resolveRegion(user),
    user,
  );

  return provider ? (
    <div
      className={cx(
        'relative aspect-square size-7 overflow-hidden rounded-md',
        className,
      )}
    >
      <Image alt={provider.name} height={28} src={provider.logo} width={28} />
    </div>
  ) : null;
}
