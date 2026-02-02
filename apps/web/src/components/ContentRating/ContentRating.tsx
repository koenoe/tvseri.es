import { cx } from 'class-variance-authority';
import auth from '@/auth';
import { fetchTvSeriesContentRating } from '@/lib/api';
import { getRegion } from '@/lib/geo';

export default async function ContentRating({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  const [region, { user }] = await Promise.all([getRegion(), auth()]);
  const contentRating = await fetchTvSeriesContentRating(
    id,
    user?.country || region,
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
