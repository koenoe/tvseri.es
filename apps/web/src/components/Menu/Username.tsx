import Link from 'next/link';

import auth from '@/auth';

import AuthButton from '../Buttons/AuthButton';

export default async function Username() {
  const { user } = await auth();

  if (!user) {
    return <AuthButton />;
  }

  const profileName =
    user.username || user.tmdbUsername || user.name || 'anonymous';

  return (
    <div className="relative flex h-[18px] w-auto items-center justify-end overflow-hidden text-base lowercase leading-none text-white">
      <Link
        className="relative h-full truncate text-ellipsis"
        href={{
          pathname: `/u/${user.username}`,
        }}
      >
        {profileName}
      </Link>
    </div>
  );
}
