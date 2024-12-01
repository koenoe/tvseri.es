import { cookies } from 'next/headers';

import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { decryptToken } from '@/lib/token';

import LoginButton from '../Buttons/LoginButton';

export default async function Username() {
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return <LoginButton />;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);

  if (!session) {
    return <LoginButton />;
  }

  const user = await findUser({ userId: session.userId });

  if (!user) {
    return <LoginButton />;
  }

  const profileName =
    user.tmdbUsername || user.username || user.name || 'anonymous';

  return (
    <div className="relative flex h-[18px] w-auto items-center justify-end overflow-hidden text-base lowercase leading-none text-white">
      <span className="relative h-full truncate text-ellipsis">
        {profileName}
      </span>
    </div>
  );
}
