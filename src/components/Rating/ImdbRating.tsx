import { cx } from 'class-variance-authority';
import { unstable_cacheLife as cacheLife } from 'next/cache';
import Link from 'next/link';

import { fetchRating } from '@/lib/mdblist';
import formatVoteCount from '@/utils/formatCount';

export default async function ImdbRating({
  className,
  id,
}: {
  className?: string;
  id: number;
}) {
  'use cache';
  cacheLife('days');

  try {
    const rating = await fetchRating(id, 'show', 'imdb');

    return rating ? (
      <Link
        className={cx(
          'flex items-center gap-3 transition-all hover:scale-110',
          className,
        )}
        target="_blank"
        href={`https://www.imdb.com/title/${rating.imdbid}`}
      >
        <svg
          className="h-6 w-6 text-yellow-300"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 22 20"
        >
          <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z" />
        </svg>
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
