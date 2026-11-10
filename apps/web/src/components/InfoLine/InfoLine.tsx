import type { TvSeries } from '@tvseri.es/schemas';
import Link from 'next/link';
import type { ReactNode } from 'react';

import GenreMetaItem from '@/components/ShowMeta/GenreMetaItem';
import ShowMeta from '@/components/ShowMeta/ShowMeta';

/**
 * The show line on the show hero and the track header: year → seasons → all
 * genres as links to /discover. Below md the genres drop, so the row always
 * fits next to `children` (content rating and provider), which follow it.
 */
export default function InfoLine({
  children,
  tvSeries,
}: Readonly<{
  children?: ReactNode;
  tvSeries: TvSeries;
}>) {
  const genreLinks = tvSeries.genres.map((genre, index) => {
    const href = { pathname: '/discover', query: { with_genres: genre.id } };
    const label =
      index < tvSeries.genres.length - 1 ? `${genre.name}, ` : genre.name;

    return (
      <Link
        className="hover:underline"
        href={href}
        key={genre.id}
        prefetch={false}
      >
        {label}
      </Link>
    );
  });
  const genres =
    genreLinks.length > 0 ? (
      <GenreMetaItem className="hidden md:inline-flex">
        {genreLinks}
      </GenreMetaItem>
    ) : null;

  return (
    <div className="flex w-full items-center">
      <ShowMeta
        numberOfSeasons={tvSeries.numberOfSeasons}
        releaseYear={tvSeries.releaseYear}
      >
        {genres}
      </ShowMeta>
      {children}
    </div>
  );
}
