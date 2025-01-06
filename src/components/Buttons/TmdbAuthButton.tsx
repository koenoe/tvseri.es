'use client';

import { useTransition, memo, useMemo, useCallback } from 'react';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

import { loginWithTmdb } from '@/app/actions';
import Tmdb from '@/assets/tmdb.svg';

import LoadingDots from '../LoadingDots/LoadingDots';

const TmdbAuthButton = ({
  className,
}: Readonly<{
  className?: string;
}>) => {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const redirectPath = useMemo(
    () => decodeURIComponent(searchParams.get('redirect') ?? '/'),
    [searchParams],
  );

  const handleClick = useCallback(() => {
    startTransition(async () => {
      try {
        await loginWithTmdb(redirectPath);
      } catch (_error) {}
    });
  }, [redirectPath]);

  return (
    <button
      onClick={handleClick}
      className={twMerge(
        'relative flex h-[10px] w-[66px] items-center justify-start',
        className,
      )}
    >
      {isPending ? (
        <LoadingDots />
      ) : (
        <Image src={Tmdb} alt="TMDb" width={66} height={10} />
      )}
    </button>
  );
};

export default memo(TmdbAuthButton);
