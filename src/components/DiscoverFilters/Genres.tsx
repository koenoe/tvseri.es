'use client';

import { useCallback, useMemo } from 'react';

import { cva } from 'class-variance-authority';
import { useRouter, useSearchParams } from 'next/navigation';

import { type Genre } from '@/types/genre';

const buttonStyles = cva(
  'text-nowrap rounded-3xl px-5 py-4 leading-none tracking-wide font-medium text-xs',
  {
    variants: {
      state: {
        active: 'bg-white text-neutral-800',
        inactive: 'bg-white/10 text-white',
      },
    },
    defaultVariants: {
      state: 'inactive',
    },
  },
);

function GenreButton({
  genre,
  isActive = false,
  onClick,
}: Readonly<{
  genre: Genre;
  isActive: boolean;
  onClick?: (genre: Genre) => void;
}>) {
  return (
    <button
      className={buttonStyles({ state: isActive ? 'active' : 'inactive' })}
      onClick={() => onClick?.(genre)}
    >
      {genre.name}
    </button>
  );
}

export default function DiscoverGenres({
  genres,
}: Readonly<{
  genres: Genre[];
}>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedGenreIds = useMemo(() => {
    const searchParamWithGenres = searchParams.get('with_genres');
    return searchParamWithGenres
      ? searchParamWithGenres.split(',').map(Number)
      : [];
  }, [searchParams]);

  const handleOnClick = useCallback(
    (genre: Genre) => {
      const isActive = selectedGenreIds.includes(genre.id);
      const updatedGenreIds = isActive
        ? selectedGenreIds.filter((id) => id !== genre.id)
        : [...selectedGenreIds, genre.id];

      const params = new URLSearchParams(searchParams.toString());
      if (updatedGenreIds.length > 0) {
        params.set('with_genres', updatedGenreIds.join(','));
      } else {
        params.delete('with_genres');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, selectedGenreIds],
  );

  return (
    <div className="flex w-full flex-row flex-wrap items-start gap-3">
      {genres.map((genre) => (
        <GenreButton
          key={genre.id}
          genre={genre}
          isActive={selectedGenreIds.includes(genre.id)}
          onClick={handleOnClick}
        />
      ))}
    </div>
  );
}