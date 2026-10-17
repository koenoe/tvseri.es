'use client';

import Link from 'next/link';

import AuthButton from '../Buttons/AuthButton';
import useMenuUsername from './useMenuUsername';

export default function Username() {
  const username = useMenuUsername();

  if (username === undefined) {
    return <div className="h-[18px] w-16 animate-pulse bg-white/30" />;
  }

  if (!username) {
    return <AuthButton />;
  }

  const href = `/u/${username}`;

  return (
    <div className="relative flex h-[18px] w-auto items-center justify-end overflow-hidden text-base lowercase leading-none text-white">
      <Link className="relative h-full truncate text-ellipsis" href={href}>
        {username}
      </Link>
    </div>
  );
}
