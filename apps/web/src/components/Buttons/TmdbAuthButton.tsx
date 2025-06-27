'use client';

import Image from 'next/image';
import { memo, useCallback, useTransition } from 'react';
import { twMerge } from 'tailwind-merge';

import { loginWithTmdb } from '@/app/actions';
import Tmdb from '@/assets/tmdb.svg';

import LoadingDots from '../LoadingDots/LoadingDots';

const TmdbAuthButton = ({
  className,
  redirectPath = '/',
}: Readonly<{
  className?: string;
  redirectPath?: string;
}>) => {
  const [isPending, startTransition] = useTransition();

  const handleClick = useCallback(() => {
    startTransition(async () => {
      try {
        await loginWithTmdb(redirectPath);
      } catch (_error) {}
    });
  }, [redirectPath]);

  return (
    <button
      className={twMerge(
        'relative flex h-[10px] w-[66px] items-center justify-start',
        className,
      )}
      onClick={handleClick}
    >
      {isPending ? (
        <LoadingDots />
      ) : (
        <Image alt="TMDb" height={10} src={Tmdb} width={66} />
      )}
    </button>
  );
};

export default memo(TmdbAuthButton);
