import { cx } from 'class-variance-authority';
import { headers } from 'next/headers';
import Image from 'next/image';
import auth from '@/auth';
import { fetchTvSeriesWatchProvider } from '@/lib/api';

export default async function WatchProvider({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  const [headerStore, { encryptedSessionId, session }] = await Promise.all([
    headers(),
    auth(),
  ]);
  const region =
    session?.country || headerStore.get('cloudfront-viewer-country') || 'US';
  const provider = await fetchTvSeriesWatchProvider(
    id,
    region,
    encryptedSessionId ?? undefined,
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
