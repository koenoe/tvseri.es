import { cx } from 'class-variance-authority';
import Link from 'next/link';

import { StarIcon } from '@/components/Icons/StarIcon';
import { fetchTvSeriesRating } from '@/lib/api';
import formatVoteCount from '@/utils/formatCount';

export default async function ImdbRating({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  try {
    const rating = await fetchTvSeriesRating(id, 'imdb');

    return rating ? (
      <Link
        className={cx(
          'flex items-center gap-3 transition-all hover:scale-110',
          className,
        )}
        href={`https://www.imdb.com/title/${rating.imdbid}`}
        target="_blank"
      >
        <StarIcon className="h-6 w-6 text-yellow-300" />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <p className="text-2xl font-semibold leading-none">
              {rating.value.toFixed(1)}
            </p>
            <p className="text-base font-light leading-none opacity-60">/ 10</p>
          </div>
          <p className="text-xs leading-none opacity-60">
            {formatVoteCount(rating.votes)}
          </p>
        </div>
      </Link>
    ) : null;
  } catch (_error) {
    return null;
  }
}
