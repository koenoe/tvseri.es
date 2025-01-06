import { cookies } from 'next/headers';
import Link from 'next/link';

import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { decryptToken } from '@/lib/token';

import AuthButton from '../Buttons/AuthButton';

export default async function Username() {
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return <AuthButton />;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);

  if (!session) {
    return <AuthButton />;
  }

  const user = await findUser({ userId: session.userId });

  if (!user) {
    return <AuthButton />;
  }

  const profileName =
    user.tmdbUsername || user.username || user.name || 'anonymous';

  return (
    <div className="relative flex h-[18px] w-auto items-center justify-end overflow-hidden text-base lowercase leading-none text-white">
      <Link
        className="relative h-full truncate text-ellipsis"
        href={`/u/${user.username}/stats/2024`}
      >
        {profileName}
      </Link>
    </div>
  );
}
