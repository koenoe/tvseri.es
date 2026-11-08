import { cx } from 'class-variance-authority';
import auth from '@/auth';
import { fetchTvSeriesContentRating } from '@/lib/api';
import { resolveRegion } from '@/lib/geo';

export default async function ContentRating({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  const { user } = await auth();
  const contentRating = await fetchTvSeriesContentRating(
    id,
    await resolveRegion(user),
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
