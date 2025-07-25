import { cx } from 'class-variance-authority';
import { headers } from 'next/headers';
import auth from '@/auth';
import { fetchTvSeriesContentRating } from '@/lib/api';

export default async function ContentRating({
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
  const contentRating = await fetchTvSeriesContentRating(
    id,
    region,
    encryptedSessionId ?? undefined,
  );

  return contentRating ? (
    <div
      className={cx(
        'flex h-7 min-w-7 items-center justify-center rounded-md border p-1 text-xs opacity-60',
        className,
      )}
    >
      {contentRating}
    </div>
  ) : null;
}
