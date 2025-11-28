import type { User } from '@tvseri.es/schemas';
import Link from 'next/link';

import AuthButton from '../Buttons/AuthButton';

export default async function Username({
  authPromise,
}: Readonly<{
  authPromise: Promise<{ user: User | null }>;
}>) {
  const { user } = await authPromise;

  if (!user) {
    return <AuthButton />;
  }

  const profileName = user.username || user.name || 'anonymous';

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
