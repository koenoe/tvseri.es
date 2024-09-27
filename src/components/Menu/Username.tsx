import { cookies } from 'next/headers';

import { fetchAccountDetails } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import LoginButton from '../Buttons/LoginButton';

export default async function Username() {
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return <LoginButton />;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const user = await fetchAccountDetails(decryptedSessionId);
  const profileName = user.username ?? user.name ?? 'anonymous';

  if (!user) {
    return <LoginButton />;
  }

  return (
    <div className="relative flex h-[18px] w-auto items-center justify-end overflow-hidden text-base lowercase leading-none text-white">
      <span className="relative h-full truncate text-ellipsis">
        {profileName}
      </span>
    </div>
  );
}
